import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  CleanupLegacyLetterUploadBody,
  CleanupLegacyLetterUploadResponse,
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { getObjectAclPolicy, ObjectPermission } from "../lib/objectAcl";
import { requireAuth, getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  collectionItemsTable,
  familyMembersTable,
  legacyLettersTable,
  lifeEventsTable,
  memoryCollectionsTable,
  messagesTable,
  peopleTable,
  pulsePostsTable,
  storyAnswersTable,
  usersTable,
  vaultItemsTable,
  voiceMemosTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function hasObjectReference(objectPath: string): Promise<boolean> {
  const references = await Promise.all([
    db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.avatarUrl, objectPath)).limit(1),
    db.select({ id: voiceMemosTable.id }).from(voiceMemosTable).where(eq(voiceMemosTable.objectPath, objectPath)).limit(1),
    db.select({ id: messagesTable.id }).from(messagesTable).where(eq(messagesTable.audioUrl, objectPath)).limit(1),
    db.select({ id: storyAnswersTable.id }).from(storyAnswersTable).where(eq(storyAnswersTable.audioUrl, objectPath)).limit(1),
    db.select({ id: legacyLettersTable.id }).from(legacyLettersTable).where(eq(legacyLettersTable.mediaUrl, objectPath)).limit(1),
    db.select({ id: memoryCollectionsTable.id }).from(memoryCollectionsTable).where(eq(memoryCollectionsTable.coverUrl, objectPath)).limit(1),
    db.select({ id: collectionItemsTable.id }).from(collectionItemsTable).where(eq(collectionItemsTable.mediaUrl, objectPath)).limit(1),
    db.select({ id: peopleTable.id }).from(peopleTable).where(eq(peopleTable.photoUrl, objectPath)).limit(1),
    db.select({ id: familyMembersTable.id }).from(familyMembersTable).where(eq(familyMembersTable.photoUrl, objectPath)).limit(1),
    db.select({ id: pulsePostsTable.id }).from(pulsePostsTable).where(eq(pulsePostsTable.mediaUrl, objectPath)).limit(1),
    db.select({ id: vaultItemsTable.id }).from(vaultItemsTable).where(eq(vaultItemsTable.fileUrl, objectPath)).limit(1),
    db.select({ id: lifeEventsTable.id })
      .from(lifeEventsTable)
      .where(sql`${lifeEventsTable.mediaUrls} @> ${JSON.stringify([{ objectPath }])}::jsonb`)
      .limit(1),
  ]);

  return references.some(rows => rows.length > 0);
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType } = parsed.data;

    const uploadURL = await objectStorageService.getObjectEntityUploadURL(
      getUserId(req),
      parsed.data.purpose,
    );
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * Delete a failed legacy-letter upload only if it is still unassociated.
 * The purpose-scoped upload path, non-Legacy association rejection, and
 * cross-entity database reference check protect existing media. An ACL owner
 * policy alone is not evidence that an object is unassociated.
 */
router.post("/storage/uploads/cleanup", requireAuth, async (req: Request, res: Response) => {
  const parsed = CleanupLegacyLetterUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid objectPath is required" });
    return;
  }

  const userId = getUserId(req);
  const objectPath = parsed.data.objectPath;
  const letterUploadPrefix = `/objects/uploads/${userId}/legacy-letters/`;
  const objectId = objectPath.startsWith(letterUploadPrefix)
    ? objectPath.slice(letterUploadPrefix.length)
    : "";
  if (!objectId || objectId.includes("/") || objectPath.includes("..") || objectPath.includes("\\")) {
    res.status(400).json({ error: "This upload does not belong to the current user" });
    return;
  }

  try {
    if (await hasObjectReference(objectPath)) {
      res.status(409).json({ error: "This upload is already associated with saved media" });
      return;
    }

    try {
      const file = await objectStorageService.getObjectEntityFile(objectPath);
      const policy = await getObjectAclPolicy(file);
      if (policy && policy.owner !== String(userId)) {
        res.status(400).json({ error: "This upload does not belong to the current user" });
        return;
      }
      await objectStorageService.deleteObjectEntityFile(objectPath);
    } catch (error) {
      if (!(error instanceof ObjectNotFoundError)) throw error;
    }

    res.json(CleanupLegacyLetterUploadResponse.parse({ success: true }));
  } catch (error) {
    req.log.error({ err: error }, "Failed to clean up legacy-letter upload");
    res.status(500).json({ error: "Failed to clean up uploaded attachment" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", requireAuth, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const canAccess = await objectStorageService.canAccessObjectEntity({
      userId: String(getUserId(req)),
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
