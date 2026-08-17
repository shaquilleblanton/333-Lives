import { Router } from "express";
import { getUserId } from "../middlewares/auth";
import { db } from "@workspace/db";
import {
  aiConversationsTable,
  aiMessagesTable,
  habitsTable,
  habitCheckinsTable,
  intentionsTable,
  goalsTable,
  usersTable,
} from "@workspace/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getTodayDate } from "../lib/date";

const router = Router();

// ─── Conversations ────────────────────────────────────────────────────────────

router.get("/anthropic/conversations", async (req, res) => {
  const userId = getUserId(req);
  const rows = await db
    .select()
    .from(aiConversationsTable)
    .where(eq(aiConversationsTable.userId, userId))
    .orderBy(desc(aiConversationsTable.createdAt));
  return res.json(rows);
});

router.post("/anthropic/conversations", async (req, res) => {
  const userId = getUserId(req);
  const { title } = req.body;
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }
  const [conv] = await db
    .insert(aiConversationsTable)
    .values({ userId, title: title.trim() })
    .returning();
  return res.status(201).json(conv);
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.userId, userId)));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msgs = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.conversationId, id))
    .orderBy(aiMessagesTable.createdAt);

  return res.json({ ...conv, messages: msgs });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const deleted = await db
    .delete(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.userId, userId)))
    .returning();
  if (deleted.length === 0) return res.status(404).json({ error: "Conversation not found" });
  return res.status(204).send();
});

// ─── Messages (SSE streaming) ─────────────────────────────────────────────────

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [conv] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.userId, userId)));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const msgs = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.conversationId, id))
    .orderBy(aiMessagesTable.createdAt);
  return res.json(msgs);
});

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const userId = getUserId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { content } = req.body;
  if (!content || typeof content !== "string") {
    return res.status(400).json({ error: "content is required" });
  }

  // Verify conversation belongs to user
  const [conv] = await db
    .select()
    .from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.userId, userId)));
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  // Save user message
  await db
    .insert(aiMessagesTable)
    .values({ conversationId: id, role: "user", content: content.trim() });

  // Fetch full history for context
  const history = await db
    .select()
    .from(aiMessagesTable)
    .where(eq(aiMessagesTable.conversationId, id))
    .orderBy(aiMessagesTable.createdAt);

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // Stream response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system:
        "You are a thoughtful, warm, and insightful life coach and companion inside the 333 Lives app. You help users reflect on their habits, intentions, goals, and daily life. Be concise, encouraging, and genuine. Never be preachy.",
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    // Save assistant reply
    await db
      .insert(aiMessagesTable)
      .values({ conversationId: id, role: "assistant", content: fullResponse });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("Anthropic stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  } finally {
    res.end();
  }
  return;
});

// ─── Life Coach Insights ──────────────────────────────────────────────────────

router.get("/anthropic/coach", async (req, res) => {
  const userId = getUserId(req);
  const today = getTodayDate(req);

  // Gather user context in parallel
  const [userRows, habits, recentCheckins, todayIntentions, goals] =
    await Promise.all([
      db
        .select({
          name: usersTable.name,
          streakDays: usersTable.streakDays,
        })
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1),
      db
        .select()
        .from(habitsTable)
        .where(eq(habitsTable.userId, userId))
        .orderBy(desc(habitsTable.currentStreak)),
      db
        .select()
        .from(habitCheckinsTable)
        .where(
          and(
            eq(habitCheckinsTable.date, today),
          )
        )
        .limit(20),
      db
        .select()
        .from(intentionsTable)
        .where(and(eq(intentionsTable.userId, userId), eq(intentionsTable.date, today))),
      db
        .select()
        .from(goalsTable)
        .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isCompleted, false)))
        .limit(5),
    ]);

  const user = userRows[0];
  const streakDays = user?.streakDays ?? 0;
  const userName = user?.name ?? "friend";

  // Build context string for Claude
  const habitsSummary =
    habits.length > 0
      ? habits
          .slice(0, 5)
          .map(
            (h) =>
              `• ${h.name} (streak: ${h.currentStreak} days, total: ${h.totalCheckins} check-ins)`
          )
          .join("\n")
      : "No habits tracked yet.";

  const completedIntentions = todayIntentions.filter((i) => i.isCompleted).length;
  const intentionsSummary =
    todayIntentions.length > 0
      ? `${completedIntentions}/${todayIntentions.length} intentions completed today`
      : "No intentions set for today.";

  const goalsSummary =
    goals.length > 0
      ? goals.map((g) => `• ${g.title} (${g.progress}% progress)`).join("\n")
      : "No active goals.";

  const prompt = `You are a warm, insightful personal life coach. Based on ${userName}'s current progress, write a brief, personalized coaching insight (2-3 short paragraphs). Be specific, encouraging, and actionable. Do not be generic.

Their data today:
- 333 streak: ${streakDays} days
- Today's intentions: ${intentionsSummary}
- Active habits:\n${habitsSummary}
- Active goals:\n${goalsSummary}

Write a personal message to ${userName} directly (use "you"). Focus on what's working, what could use attention, and one concrete suggestion for today.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const insights = block.type === "text" ? block.text : "";

    return res.json({
      insights,
      streakDays,
      habitsSummary,
      intentionsSummary,
    });
  } catch (err) {
    console.error("Coach insights error:", err);
    return res.status(500).json({ error: "Failed to generate insights" });
  }
});

// ─── AI Affirmations ──────────────────────────────────────────────────────────

router.post("/anthropic/affirmations/generate", async (req, res) => {
  const userId = getUserId(req);
  const today = getTodayDate(req);

  const [userRows, goals, recentIntentions] = await Promise.all([
    db
      .select({ name: usersTable.name, streakDays: usersTable.streakDays })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1),
    db
      .select({ title: goalsTable.title, category: goalsTable.category })
      .from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), eq(goalsTable.isCompleted, false)))
      .limit(5),
    db
      .select({ text: intentionsTable.text })
      .from(intentionsTable)
      .where(eq(intentionsTable.userId, userId))
      .orderBy(desc(intentionsTable.createdAt))
      .limit(9),
  ]);

  const user = userRows[0];
  const userName = user?.name ?? "friend";
  const streakDays = user?.streakDays ?? 0;

  const goalsList =
    goals.length > 0
      ? goals.map((g) => `• ${g.title} (${g.category})`).join("\n")
      : "General growth and wellbeing";

  const intentionsList =
    recentIntentions.length > 0
      ? recentIntentions.map((i) => `• ${i.text}`).join("\n")
      : "Living with intention";

  const prompt = `Write ONE powerful, personalized affirmation for ${userName}. 

Context:
- Their current 333 streak: ${streakDays} days
- Their active goals:\n${goalsList}
- Their recent intentions:\n${intentionsList}

Rules:
- Write exactly one affirmation (1-2 sentences max)
- Start with "I" 
- Make it specific to their actual goals/intentions, not generic
- Make it empowering, present-tense, and genuine
- Do NOT include quotes, labels, or any extra text — just the affirmation itself`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const text = block.type === "text" ? block.text.trim() : "";

    return res.json({ text });
  } catch (err) {
    console.error("Affirmation generation error:", err);
    return res.status(500).json({ error: "Failed to generate affirmation" });
  }
});

export default router;
