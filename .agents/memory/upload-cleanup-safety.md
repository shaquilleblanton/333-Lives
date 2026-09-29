---
name: Upload cleanup safety
description: Guardrails for deleting uploaded media after a failed save
---

An upload's owner ACL only proves who owns it, not whether another entity already references it. Cleanup endpoints must be purpose-scoped and refuse to delete media referenced by any supported entity. When adding a new media-bearing entity, update the association restrictions and reference checks used by cleanup.

**Why:** A cleanup route that checked only Legacy Letters could delete a user's own voice memo or other media while leaving its database record behind. An uncertain network/server error can also arrive after a save succeeded, so the client must not assume the upload is orphaned.

**How to apply:** For failed-save cleanup, distinguish definitive rejection from ambiguous outcomes. Reuse a pending upload for retries, preserve media on ambiguous results, and only delete after server-side ownership, purpose, and cross-entity reference checks. Durable cleanup of abandoned ambiguous uploads needs an explicit claim/reconciliation lifecycle rather than a blind timeout.