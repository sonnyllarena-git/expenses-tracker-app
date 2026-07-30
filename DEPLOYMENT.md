# Deployment Strategy — Expense Tracker (Mobile)

Phase 1 has no backend to deploy — "deployment" means shipping the mobile binary. This is a solo-developer flow on Windows, so it leans entirely on Expo's cloud build service (EAS) rather than local Xcode/Android Studio builds.

## Build pipeline (EAS)

1. `eas build --platform android --profile preview` — internal testing builds (APK, installable directly, no Play Store review needed) throughout development.
2. `eas build --platform ios --profile preview` — **requires an Apple Developer account** ($99/yr) and runs entirely on EAS's cloud infra, since there's no local macOS to build on. This is the only way to get an installable iOS build on this Windows setup.
3. `eas build --platform all --profile production` — production builds for store submission, once Week 12 quality gates pass.

## Store submission

- **Google Play**: `eas submit --platform android`. Requires a Play Console account ($25 one-time) and a signed production build. Play has a review queue (hours to a few days) plus a mandatory closed-testing track before general production release for new accounts — budget for this in the Week 12 timeline, don't assume same-day approval.
- **Apple App Store**: `eas submit --platform ios`. Requires the Apple Developer Program ($99/yr). App Review timelines vary (often 1-3 days but can be longer); first submissions from a new developer account sometimes face extra scrutiny — don't schedule a hard launch date against App Review's queue.

## Environments

Since there's no backend, there's effectively one "environment" (the app binary), but EAS build **profiles** in `eas.json` stand in for staging/production:
- `development` — dev-client build for local testing with hot reload
- `preview` — internal distribution (APK / ad-hoc iOS) for Sonny to test on a real device before wider testing
- `production` — store-bound build

## What changes when Phase 2 (backend sync) lands

This section gets rewritten, not appended to, once a backend exists — at that point real staging/production environments, database migration rollout, and zero-downtime API deploys (per agent.md.md's general Deployment & DevOps section) become relevant. Flagging now so this doc doesn't silently rot: **do not reuse this doc's structure unmodified once a backend is introduced.**

## Pre-submission checklist (Week 12, not yet)
- [ ] Privacy policy published (see SECURITY.md)
- [ ] App icons + splash screen finalized in `app.json`
- [ ] Store screenshots (iOS + Android device sizes) and description copy ready
- [ ] Production EAS build passes all quality gates from the original spec (tests, lint, no crashes)
- [ ] Apple Developer + Google Play accounts provisioned ahead of time — account setup/verification can itself take days, don't discover this in Week 12
