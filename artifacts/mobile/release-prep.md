# Next mobile release

## Build numbers

The latest successful cloud builds are iOS 39 and Android 11. The current local
baselines are iOS 39 and Android 11. Production uses local version sourcing and
`autoIncrement: true`, so the next production builds become **iOS 40 and Android 12**.
Keep version 1.0.0 and both application identifiers unchanged.

The CLI updates local numbers during a production build. Commit those updates
afterward so another build does not reuse a number from an older checkout.
Check the latest EAS/store numbers again before starting a later release.

## Build preparation

- pnpm is pinned to 10.26.1 in the workspace and EAS production/preview profiles.
- The navigation cleanup, Today improvements and habit category/streak changes
  must be present in the checkout used for the new builds.
- Deploy and verify the updated API and additive habit-category database schema
  before releasing a mobile binary that points to the production API.
- Local mobile/API/web typechecks, mobile/API tests and iOS Hermes export passed
  for the cleanup. A signed-in device pass and a new native build are still needed.

## iOS build (not started by this preparation)

From artifacts/mobile, after confirming the release checkout and API:

```sh
eas build --platform ios --profile production --non-interactive
```

This builds but does not submit the app. Do not add `--auto-submit` until the
release has been validated and submission is explicitly approved.

## Android blockers

- Resolve the exposed signing key before producing/submitting the next release.
  The historical android_keystore.zip/android.p12 exposure is not repaired by
  ignoring those filenames or rebuilding.
- The submit profile references ./google-service-account.json, which is absent.
  Set up the Play submission credentials securely before automated submission.
  Never commit that file.

## Store media

The interface-only crops of the old screenshot mockups are not current screenshots.
Capture the new release interface without phone status indicators, at accepted
store dimensions. Do not include iPad screenshots while tablet support is off.
