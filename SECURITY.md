# Security Checklist — Expense Tracker (Mobile, Offline-First)

Adapted from agent.md.md's OWASP Top 10 checklist for a Phase 1 app with **no backend and no network calls**. Several standard items (auth, API access control, SSRF, session tokens) don't apply yet — noted as N/A rather than silently dropped, so they aren't forgotten when Phase 2 adds a backend.

## Applicable now (Phase 1)

- [ ] **No network calls policy**: the app makes zero outbound requests. CI should fail if `fetch`, `axios`, or `XMLHttpRequest` appear anywhere in `src/`/`app/` (mirrors agent.md.md's automated check for the web default; add as a CI grep step in Week 1).
- [ ] **Local data encryption at rest**: rely on OS-level encryption (iOS Data Protection / Android file-based encryption), which is on by default on modern devices. Document this assumption in DEPLOYMENT.md rather than rolling custom encryption — SQLCipher is a Phase 2+ consideration if a threat model ever requires it (e.g. shared/managed devices).
- [ ] **Input validation**: amount must be positive and within a sane max (e.g. reject > 10,000,000 in the account's currency); date must not be in the future for a normal expense (recurring templates are the one exception — validated separately); category must exist in the `categories` table (FK constraint) or be created through the custom-category flow, never freeform.
- [ ] **No sensitive data in logs**: no `console.log` of full expense records, receipt paths with PII-adjacent filenames, or the user's email. CI grep check for obviously risky log patterns.
- [ ] **Receipt photo storage**: stored in the app's private document directory (not shared/public storage), not backed up to iCloud/Google Photos by default — verify against Expo's `expo-file-system` directory choice (`Paths.document`, not `Paths.cache`, so it survives app restarts but stays sandboxed).
- [ ] **Data export**: CSV export via `expo-sharing` only shares what the user explicitly triggers — no background/automatic export.
- [ ] **Data deletion**: Settings screen must offer full data delete (drop all local tables + delete receipt photo files), for "right to delete" even though there's no Phase 1 backend to also purge.
- [ ] **Dependency hygiene**: `npm audit` in CI; Dependabot enabled on the repo once pushed to GitHub.
- [ ] **TypeScript strict mode**: non-negotiable per agent.md.md; no `any` or `@ts-ignore` without a comment justifying it.

## Explicitly N/A in Phase 1 (revisit when a backend exists)

- Authentication/password hashing, JWT — Phase 1 has offline login only (device possession = access), no server-side identity.
- Broken access control / RBAC on endpoints — no endpoints exist.
- SSRF, injection via API params — no network layer to attack.
- Data-in-transit encryption (HTTPS) — nothing transits.
- Push notification credentials — Phase 1 notifications are local-only (`expo-notifications`, no push server).

## PH Data Privacy Act notes
Even fully offline, a privacy policy is still warranted before App Store/Play Store submission (both stores require one regardless of whether data leaves the device). Minimal Phase 1 privacy policy should state: no data leaves the device, no analytics/tracking in Phase 1, receipt photos and expense data are stored locally and deleted on app uninstall or via the in-app "delete all data" action. Draft this before Week 12 submission prep, not after.
