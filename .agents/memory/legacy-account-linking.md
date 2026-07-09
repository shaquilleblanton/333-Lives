---
name: Legacy account linking
description: How pre-auth (legacy) user data is migrated to a real Clerk account, and why blanket claiming is forbidden
---

# Legacy account linking

Rule: JIT provisioning in the API auth middleware links local user rows only by (1) existing clerkId, or (2) exact email match on a row with NO clerkId. Never add a "first sign-in claims the unlinked legacy row" rule.

**Why:** An e2e test proved the blanket claim let a brand-new stranger account adopt the owner's entire dataset (row id=1) on first sign-in — email/name were overwritten and all data (intentions, vault, letters…) became theirs. This is an account-takeover / data-leak class bug.

**How to apply:** To migrate the owner's legacy data, set the legacy row's email to the exact email he will sign in with (Clerk verifies emails), then his first sign-in links via the email-match rule. Only claim rows where clerkId IS NULL — never relink a row already bound to a different Clerk account.

Related lesson: nested sub-resource endpoints (e.g. POST /habits/:id/checkin) must verify the parent resource's ownership before any write — scoping only top-level CRUD is not enough (IDOR).
