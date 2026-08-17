---
name: Anthropic AI features
description: Three Claude-powered features built into the mobile app — Life Coach, AI Chat, and AI Affirmations — plus the backend routes and DB schema.
---

# Anthropic AI Features

## Architecture

- **Integration**: Replit AI Integrations proxy (`AI_INTEGRATIONS_ANTHROPIC_BASE_URL` + `AI_INTEGRATIONS_ANTHROPIC_API_KEY` already set in env)
- **Package**: `lib/integrations-anthropic-ai/` — template from `.local/skills/ai-integrations-anthropic/`
- **DB tables**: `ai_conversations` + `ai_messages` (renamed from template defaults `conversations`/`messages` to avoid collision with existing `messages` table used for sealed future messages)
- **Schema files**: `lib/db/src/schema/ai-conversations.ts`, `lib/db/src/schema/ai-messages.ts`

## Why `ai_conversations`/`ai_messages` not `conversations`/`messages`

The project already has a `messages` table (sealed future messages — `lib/db/src/schema/messages.ts`). Using the template's default names would have caused a Drizzle schema barrel export conflict.

## Backend routes (`artifacts/api-server/src/routes/anthropic.ts`)

- `GET /api/anthropic/conversations` — list user's conversations
- `POST /api/anthropic/conversations` — create conversation
- `GET /api/anthropic/conversations/:id` — get conv + messages
- `DELETE /api/anthropic/conversations/:id` — delete
- `GET /api/anthropic/conversations/:id/messages` — list messages
- `POST /api/anthropic/conversations/:id/messages` — SSE streaming reply (saves user + assistant messages to DB)
- `GET /api/anthropic/coach` — one-shot life coach insights (pulls habits, intentions, goals, streak from DB)
- `POST /api/anthropic/affirmations/generate` — generate AI affirmation using goals + recent intentions

## Mobile screens

- `artifacts/mobile/app/(tabs)/ai-chat.tsx` — conversation list + streaming chat thread
- `artifacts/mobile/app/(tabs)/ai-coach.tsx` — personalized coach insights
- `artifacts/mobile/app/(tabs)/ai-affirmations.tsx` — generate + history
- All three registered as hidden tabs in `_layout.tsx` (href: null)
- Entry cards on Growth tab (`growth.tsx`) — horizontal scroll row above the habits/goals/journal tabs

## SSE streaming note

The `sendAnthropicMessage` orval hook is NOT used for the streaming endpoint. The mobile chat screen uses raw `fetch` + `ReadableStream` parser. `getBaseUrl()` was added to `lib/api-client-react/src/custom-fetch.ts` and exported from `src/index.ts` to support this.

## Models used

- Chat: `claude-sonnet-4-6` (balanced)
- Coach insights: `claude-sonnet-4-6`
- Affirmations: `claude-haiku-4-5` (fast, cheap for single affirmation)

## How to apply

When adding new AI features: import `anthropic` from `@workspace/integrations-anthropic-ai`, use DB tables from `@workspace/db/schema`, mount routes in `artifacts/api-server/src/routes/index.ts`. For streaming, use SSE pattern from the messages endpoint.
