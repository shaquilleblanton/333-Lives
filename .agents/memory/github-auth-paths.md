---
name: GitHub authentication paths
description: Why Git pushes and the GitHub connector must be diagnosed independently
---

Git remote operations and Replit's GitHub connector use separate credentials. A successfully attached or reauthorized connector does not establish that a Git push can authenticate; conversely, a public repository can allow anonymous reads even when both write credentials are invalid.

**Why:** This workspace's Git remote used credentials embedded in its URL while the GitHub connector had a separate OAuth credential. Both failed authentication independently, so a successful remote read was misleading as evidence of write access.

**How to apply:** Check the current status of each path independently before reporting that a push is possible. Do not print remote URLs or credential values. A 401 establishes invalid authentication, not whether a token specifically expired or whether write permissions would suffice once authentication works.