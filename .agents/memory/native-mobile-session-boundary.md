---
name: Native mobile session boundary
description: The iOS Replit app can edit shared code but cannot build or validate native Expo binaries.
---

Native Expo work must be completed from the project on replit.com, not from the iOS Replit app session.

**Why:** The iOS Replit app explicitly blocks native iOS/Android binary builds, while web and server workflows remain available.

**How to apply:** Finish web/API work when possible, but do not attempt native mobile implementation or claim mobile validation from an iOS session; tell the user to open the project on replit.com.