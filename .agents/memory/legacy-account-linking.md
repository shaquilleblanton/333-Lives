---
name: Legacy account linking
description: How pre-auth (legacy) user data is migrated to a real Clerk account, and why blanket claiming is forbidden
---

# Legacy account linking

Safety rule: Link by an existing identity-provider ID, or by an exact email match only when the local row is not already bound to a different identity-provider account. Do not assume the current implementation enforces this invariant; inspect it before describing account linking as safe. Never add a "first sign-in claims the unlinked legacy row" rule.

**Why:** An e2e test proved the blanket claim let a brand-new stranger account adopt the owner's entire dataset (row id=1) on first sign-in — email/name were overwritten and all data (intentions, vault, letters…) became theirs. This is an account-takeover / data-leak class bug.

**How to apply:** To migrate legacy data, verify the matching email and that the local row is unbound before linking it. Never reassign a row already bound to a different account solely because the email matches; tests that merely assert reassignment and deduplication do not prove safety.

Related lesson: nested sub-resource endpoints (e.g. POST /habits/:id/checkin) must verify the parent resource's ownership before any write — scoping only top-level CRUD is not enough (IDOR).
