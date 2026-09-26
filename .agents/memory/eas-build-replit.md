---
name: EAS build from Replit
description: How to run EAS build, submit, and metadata push from the Replit environment; known gotchas with credentials and env vars
---

# EAS Build from Replit

## Key flags
- `EAS_NO_VCS=1` — bypasses git lock; required for all EAS CLI calls from Replit
- `EXPO_ASC_API_KEY_PATH=/path/to.p8` — point to an ignored local file for CLI operations; do not assume the EXPO_ASC_API_KEY_P8 secret holds usable key material
- `EXPO_ASC_KEY_ID` and `EXPO_ASC_ISSUER_ID` — supply the matching identifiers for API-key authentication
- `EXPO_APPLE_TEAM_ID` — required for metadata:push
- `EXPO_APPLE_TEAM_TYPE=INDIVIDUAL` — required for metadata:push (otherwise interactive prompt hangs)

## ASC API key credential workflow
- Get the .p8 file via file upload rather than assuming a text-only secret field contains the private key. Never print the file contents or signed JWT.
- Keep any working key file out of version control. Uploaded assets can be tracked immediately; remove the uploaded copy after transferring it to an ignored location for local submit use.
- When an EAS submit profile specifies all three `ascApiKeyPath`, `ascApiKeyId`, and `ascApiKeyIssuerId` fields, EAS Submit uses that local path rather than its remotely stored key. Other submit machines must provision the ignored file before running the profile.

**Why:** Text-only secret input can be mistaken for the short key ID, and a newly uploaded private key can be committed before anyone notices. A local-path override can make a remote credential appear correctly configured while submissions fail elsewhere for a missing file.

**How to apply:** For key rotation, validate the uploaded key against a read-only App Store Connect endpoint, remove uploaded/old tracked copies, keep only an ignored local file where required, and verify the EAS credential assignment separately.

## EAS credential-manager authentication
- A valid ASC API key passed through `EXPO_ASC_*` can still cause the interactive EAS credential manager to ask for an Apple *user* login while it tries to look up the issuer ID. This is not proof that the key failed.

**Why:** The CLI's issuer-discovery step only supports user authentication, even if the API key already authenticates to App Store Connect.

**How to apply:** When adding a user-provided key without Apple user credentials, skip the optional Apple login, supply the issuer ID directly, and verify the key independently against Apple's API.

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
The project convention is **bare base64** (no PEM headers). When using it as a PEM, wrap the body in BEGIN/END PRIVATE KEY headers.
