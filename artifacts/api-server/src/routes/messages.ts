import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { messagesTable, insertMessageSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

type MessageRow = typeof messagesTable.$inferSelect;

// Lightweight in-memory throttle for passcode unlock attempts, to slow down
// brute-force guessing of message passcodes.
const UNLOCK_MAX_ATTEMPTS = 8;
const UNLOCK_WINDOW_MS = 15 * 60 * 1000;
const unlockAttempts = new Map<number, { count: number; resetAt: number }>();

function checkUnlockRateLimit(id: number): boolean {
  const now = Date.now();
  const entry = unlockAttempts.get(id);
  if (!entry || now > entry.resetAt) {
    unlockAttempts.set(id, { count: 1, resetAt: now + UNLOCK_WINDOW_MS });
    return true;
  }
  if (entry.count >= UNLOCK_MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function clearUnlockRateLimit(id: number): void {
  unlockAttempts.delete(id);
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(passcode, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPasscode(passcode: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const hashBuf = Buffer.from(hash, "hex");
  if (derived.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(derived, hashBuf);
}

// Produce a client-safe view of a message. The plaintext content (and audioUrl)
// never leaves the server unless the message is fully unlocked: the unlock date
// has passed AND there is no passcode protecting it. Passcode-protected messages
// are revealed only through POST /messages/:id/unlock.
function present(m: MessageRow, now: Date) {
  const dateReached = new Date(m.unlockDate) <= now;
  const hasPasscode = !!m.passcodeHash;
  const isUnlocked = dateReached && !hasPasscode;
  const { passcodeHash: _passcodeHash, content, audioUrl, ...rest } = m;
  return {
    ...rest,
    isUnlocked,
    dateReached,
    hasPasscode,
    requiresPasscode: dateReached && hasPasscode,
    content: isUnlocked ? content : null,
    audioUrl: isUnlocked ? audioUrl : null,
  };
}

router.get("/messages", async (req, res) => {
  const { type } = req.query;
  const rows = await db.select().from(messagesTable).where(eq(messagesTable.userId, getUserId(req)));
  const now = new Date();
  const result = rows
    .filter((m) => !type || m.type === type)
    .map((m) => present(m, now));
  return res.json(result);
});

router.post("/messages", async (req, res) => {
  const { passcode, ...body } = req.body ?? {};
  const parsed = insertMessageSchema.safeParse({
    ...body,
    unlockDate: body.unlockDate ? new Date(body.unlockDate) : undefined,
    userId: getUserId(req),
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

  const values: typeof messagesTable.$inferInsert = { ...parsed.data };
  if (typeof passcode === "string" && passcode.trim().length > 0) {
    values.passcodeHash = hashPasscode(passcode.trim());
  }

  const inserted = await db.insert(messagesTable).values(values).returning();
  return res.status(201).json(present(inserted[0], new Date()));
});

router.get("/messages/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid message id" });
  const rows = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, id), eq(messagesTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Message not found" });
  return res.json(present(rows[0], new Date()));
});

// Reveal the content of a sealed message. Requires the unlock date to have
// passed and, if set, the correct passcode. Content is only ever returned here.
router.post("/messages/:id/unlock", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid message id" });
  const { passcode } = req.body ?? {};
  const rows = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.id, id), eq(messagesTable.userId, getUserId(req))))
    .limit(1);
  if (rows.length === 0) return res.status(404).json({ error: "Message not found" });

  const m = rows[0];
  if (new Date(m.unlockDate) > new Date()) {
    return res.status(403).json({ error: "This message is still sealed until its unlock date." });
  }
  if (m.passcodeHash) {
    if (!checkUnlockRateLimit(id)) {
      return res.status(429).json({ error: "Too many attempts. Please try again later." });
    }
    if (typeof passcode !== "string" || passcode.trim().length === 0) {
      return res.status(401).json({ error: "This message requires a passcode." });
    }
    if (!verifyPasscode(passcode.trim(), m.passcodeHash)) {
      return res.status(401).json({ error: "Incorrect passcode." });
    }
    clearUnlockRateLimit(id);
  }

  return res.json({
    id: m.id,
    title: m.title,
    type: m.type,
    content: m.content,
    audioUrl: m.audioUrl,
    recipientName: m.recipientName,
    unlockDate: m.unlockDate,
  });
});

router.delete("/messages/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: "Invalid message id" });
  await db.delete(messagesTable).where(and(eq(messagesTable.id, id), eq(messagesTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
