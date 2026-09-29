# 333 Lives — store listing draft

This tracked document is the submission copy companion to `store.config.json`. The **Apple en-US name, subtitle, description, keywords, release notes, categories, and URLs in `store.config.json` are the canonical Apple listing copy**. The older, ignored `tmp/appstore/listing.md` draft was retired after reconciliation; do not copy the general Expo description in `app.json` into a store listing.

## Audience and age rating

- **Minimum account age:** 13 years old; 16 years old for residents of the European Economic Area (EEA). The mobile and web signup screens ask users to affirm this. This is self-attestation, not verified age determination.
- **Apple App Store age rating:** **Do not submit the old 4+ claim.** Complete App Store Connect's current age-rating questionnaire accurately, including relevant questions about user-generated content/social features, AI chat, and sensitive personal or estate content. If Apple's calculated rating is below **13+**, use **Override to Higher Age Rating** to display at least 13+ for the app's minimum audience; if Apple assigns a higher rating, retain it. The EEA's 16+ account restriction remains in the signup gate and privacy policy. Verify the final regional display in App Store Connect rather than assuming it can be set independently for the EEA.
- **Google Play content rating and target audience:** Complete the Play Console content-rating and target-audience questionnaires accurately. The 13+/EEA 16+ signup rule is an account policy, not a substitute for the store's own rating.

Apple guidance: [Set an app age rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating) and [age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

## Apple App Store — en-US

| Field | Draft/source |
| --- | --- |
| Name | `333 Lives` — `store.config.json` |
| Subtitle | `Live intentionally. Every day.` — `store.config.json` |
| Full description | Canonical text in `store.config.json`, reconciled against the mobile app |
| Keywords | `journal,habits,intentions,life,tracker,family,memories,gratitude,goals,mindfulness,daily,planner` — `store.config.json` |
| Categories | Health & Fitness; Lifestyle — `store.config.json` |
| Support URL | `https://333lives.app/support` — `store.config.json` |
| Marketing URL | `https://333lives.app` — `store.config.json` |
| Privacy URL | `https://333lives.app/privacy-policy` — `store.config.json` |
| Copyright | `© 2026 333 Lives` — verify the rights holder before submission |
| Promotional text | Not drafted; optional |

The existing release notes in `store.config.json` are a draft; confirm each claim against the build being submitted. Do not assume URLs, metadata, age rating, or screenshots have already been entered in App Store Connect.

**App Review notes draft:** A reviewer can create an account after confirming the minimum age, verify their email, and use the Today screen to set intentions. The Life area contains the timeline, memories, Vault, family tree, letters, and future messages. Pulse is a private Circle feed; a new account may need to add or invite people before there is content to view. Do not put reviewer credentials in this tracked file.

## Google Play — English draft

**App name:** 333 Lives

**Short description (under 80 characters):**

Set daily intentions, build habits, and keep the moments that matter.

**Full description (under 4,000 characters):**

333 Lives is a personal life companion for living with intention, capturing memories, and staying close to the people who matter most.

Start each day with up to three intentions. Check them off as you go and look back at the days you showed up for yourself. Build habits with simple check-ins, then make space to record gratitude, moods, and reflections.

Your story is more than a list of tasks. Add milestones to your Life Timeline with notes and optional photos or voice recordings. Organize media into memory collections and record voice memos for moments you want to remember.

Stay close to the people you choose. Share text, photos, or voice posts with your private Circle in Pulse and react to their moments. Add people, relationships, and photos to your Family Tree.

Write and seal Legacy Letters, or create Future Messages that unlock on a date you choose. Manage tasks, plan workouts and mark sessions complete, and keep selected documents and media in your Vault.

Live with intention today, and give your story a place to grow.

**Listing links:** Support `https://333lives.app/support`; privacy policy `https://333lives.app/privacy-policy`; website `https://333lives.app`. These are copy drafts, not a claim that the Play Console listing or links are already configured.

## Screenshot and submission decisions

- **iPhone:** Candidate generated assets exist in tracked `attached_assets/store_assets/ios_screenshot_1.png` through `_3.png` (1242 × 2688). Further 1290 × 2796 candidates and an App Store PDF exist only under ignored `tmp/appstore/`. Choose and verify a current, truthful iPhone screenshot set before submission; no final screenshot set is designated here.
- **iPad:** **Do not submit** `attached_assets/store_assets/ipad_screenshot_1.png` and `_2.png` with this draft. `app.json` currently has `ios.supportsTablet: false`. Only reconsider iPad screenshots after enabling tablet support, testing the layout, and capturing appropriate current screens.
- **Google Play:** Tracked `attached_assets/store_assets/feature_graphic.png` (1024 × 500) and `phone_screenshot_1.png` through `_3.png` (1080 × 1920) are candidates, not approved final captures. Hold the tablet candidates until tablet behavior is supported and reviewed. Verify all generated visuals against the current app before upload.
- The root `screenshots/` folder contains only a logo image, not store screenshots. This file records decisions; it does not upload images or set store ratings.

### Changes from the older Apple draft

Removed unsupported promises of a Future Board, workout streak tracking, and comments on Pulse; described the implemented Future Messages, workout sessions, and reactions instead. Replaced blanket Vault security language with specific, user-visible functionality. The former `4+` age-rating line is superseded by the age-rating guidance above.