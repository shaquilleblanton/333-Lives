import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import { eventsTable, insertEventSchema, updateEventSchema } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/events", async (req, res) => {
  const { type } = req.query;
  const rows = await db.select().from(eventsTable).where(eq(eventsTable.userId, getUserId(req)));
  const result = rows.filter((e) => !type || e.type === type);
  return res.json(result);
});

function coerceEventDates(body: Record<string, unknown>) {
  const next: Record<string, unknown> = { ...body };
  if (typeof next.startTime === "string") next.startTime = new Date(next.startTime);
  if (typeof next.endTime === "string") next.endTime = new Date(next.endTime);
  return next;
}

router.post("/events", async (req, res) => {
  const parsed = insertEventSchema.safeParse({ ...coerceEventDates(req.body), userId: getUserId(req) });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const inserted = await db.insert(eventsTable).values(parsed.data).returning();
  return res.status(201).json(inserted[0]);
});

router.put("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  const parsed = updateEventSchema.safeParse(coerceEventDates(req.body));
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const updated = await db.update(eventsTable).set(parsed.data).where(and(eq(eventsTable.id, id), eq(eventsTable.userId, getUserId(req)))).returning();
  if (updated.length === 0) return res.status(404).json({ error: "Event not found" });
  return res.json(updated[0]);
});

router.delete("/events/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  await db.delete(eventsTable).where(and(eq(eventsTable.id, id), eq(eventsTable.userId, getUserId(req))));
  return res.json({ success: true });
});

export default router;
