---
name: EAS build from Replit
description: How to run EAS build, submit, and metadata push from the Replit environment; known gotchas with credentials and env vars
---

# EAS Build from Replit

## Key flags
- `EAS_NO_VCS=1` — bypasses git lock; required for all EAS CLI calls from Replit
- `EXPO_ASC_API_KEY_PATH=/path/to.p8` — point to temp file; do NOT rely on EXPO_ASC_API_KEY_P8 secret (users repeatedly paste wrong value)
- `EXPO_ASC_KEY_ID=<10-char-id>` — set explicitly in env
- `EXPO_ASC_ISSUER_ID=$EXPO_ASC_ISSUER_ID` — from secret
- `EXPO_APPLE_TEAM_ID=262X7APXYK` — required for metadata:push
- `EXPO_APPLE_TEAM_TYPE=INDIVIDUAL` — required for metadata:push (otherwise interactive prompt hangs)

## ASC API key credential workflow
- **Never** rely on EXPO_ASC_API_KEY_P8 secret — users consistently paste only the Key ID (10 chars) instead of full .p8 content
- Always use `AskQuestion` with `fileUpload` kind to get the .p8 file directly
- After using: immediately `rm -f` the temp file AND the attached_assets copy
- Key ID for this project: `CGA9B6TAG7`; Issuer ID in `$EXPO_ASC_ISSUER_ID` secret

**Why:** The secrets form doesn't enforce multiline input and users paste the wrong thing every time. File upload is reliable.

**How to apply:** Any time ASC API key is needed, use file upload not requestSecrets for the p8 content.

## Screenshot upload via ASC REST API
- Screenshots belong to `appStoreVersionLocalizations`, NOT directly to `appStoreVersions`
- Flow: GET /appStoreVersions → GET /appStoreVersionLocalizations → GET/POST /appScreenshotSets → POST /appScreenshots (reserve) → PUT chunk → PATCH (commit with MD5)
- Use `screenshotDisplayType: "APP_IPHONE_67"` for 1290×2796 screenshots (6.7" iPhone)
- JWT: ES256, kid=KEY_ID, aud="appstoreconnect-v1", exp=now+1100
- Sign with `crypto.createSign('SHA256')` + `dsaEncoding: 'ieee-p1363'`

## Resubmitting a REJECTED app
- Cannot resubmit via API when version is in REJECTED state (reviewSubmissionItems returns 409 "not in valid state"; appStoreVersionSubmissions returns 403 "only DELETE allowed")
- User must tap "Resubmit for Review" in App Store Connect manually
- Make sure support/privacy URLs are live before resubmission

## iOS cert creation
- Needs expo.dev credentials UI or ASC API key
- Store builds must bake `pk_live_*` in eas.json (not pk_test)

## EXPO_ASC_API_KEY_P8 secret format
The secret stores **bare base64** (no PEM headers). Always wrap before use:
```js
const p8 = `-----BEGIN PRIVATE KEY-----\n${process.env.EXPO_ASC_API_KEY_P8}\n-----END PRIVATE KEY-----`;
```

## App info
- App ID: 6791305774
- Version ID: af5e8004-19c9-4fe7-979f-b0883cdbd11e
- Submitted Aug 13 2026 with Build 34 (id: b77c9e71) — state: WAITING_FOR_REVIEW
- ASC screenshot set: 9335afac (APP_IPHONE_67, 5 screenshots — COMPLETE)
- Apple Team: 262X7APXYK (INDIVIDUAL)
- Apple ID: shadblanton@yahoo.com
