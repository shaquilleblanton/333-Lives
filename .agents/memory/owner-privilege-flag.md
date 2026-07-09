---
name: Owner privilege flag
description: How admin/owner gating works and the self-escalation trap to avoid
---

Admin features are gated by a boolean privilege flag on the users table (`is_owner`), checked fresh from the DB per request by a dedicated middleware — never trust a client claim or cache it.

**Why:** drizzle-zod insert/update schemas derived from the users table automatically include the privilege column, so a naive profile-update route would let any user set their own flag. The profile update route must explicitly strip identity/privilege fields (`clerkId`, `email`, `isOwner`) before writing.

**How to apply:** whenever adding a column to `users` that must not be user-editable, also strip it in `PUT /users/me`. Admin-only response fields (e.g. private notes) must be removed server-side in the user-facing endpoints, not hidden in the UI.
