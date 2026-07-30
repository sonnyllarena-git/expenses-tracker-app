# Roadmap — Expense Tracker Phase 1 (MVP)

Refined from the original 12-week spec with the Week 1 scaffold decisions and the Detox/iOS gap (ARCHITECTURE.md ADR-007) folded in. Per agent.md.md's "one-man team" principle: one phase completed and verified before the next starts — no parallel work across weeks.

- [x] **Week 1 — Setup & Architecture** *(this session)*
  Planning docs (this set of 5 files), Expo TypeScript scaffold, git init, Drizzle schema + migrations wiring, 5-tab navigation shell (stub screens), Zustand store skeletons, ESLint/Prettier/Jest config, GitHub Actions CI, README.
  *Explicitly not done yet: any feature logic.*

- [ ] **Weeks 2-4 — Core Logic**
  Expense CRUD wired to real screens; category management (seed + custom create); budget CRUD; recurring-expense template materialization (see DATABASE_SCHEMA.md); search/filter (keyword, date range, category).

- [ ] **Weeks 5-7 — Mobile Frontend UI**
  Full Add Expense form (validation, receipt photo capture/attach), Expense List (sort/filter UI), Dashboard (monthly summary + recent expenses), Settings screen (currency, account type, sharing toggle, notification prefs, data export/delete).

- [ ] **Weeks 8-9 — Reports & Analytics**
  `react-native-gifted-charts` pie chart (by category) + trend line chart (spending over time); category breakdown; budget-vs-actual comparison; CSV export via `expo-file-system` + `expo-sharing`.

- [ ] **Weeks 10-11 — Sharing & Advanced Features**
  Family sharing toggle + role storage (`family_members` table already scaffolded); `added_by_user_id` attribution surfaced in the UI; local budget-alert notifications (`expo-notifications`, scheduled/cancelled as spending changes); recurring-expense reminder notifications.
  *Note: this is local-role/local-attribution only — actual multi-device invite/sync is Phase 2, since it needs a backend.*

- [ ] **Week 12 — Testing, Optimization & Store Prep**
  Unit tests to 80%+ coverage (Jest); Detox E2E for critical flows — **Android only**, given no macOS on this dev machine (ADR-007); performance pass (list virtualization, chart render time); DEPLOYMENT.md pre-submission checklist; EAS production builds; store listing assets.

## Deferred to Phase 2+ (unchanged from the original spec)
Backend sync/cloud backup, AI categorization, AI insights/predictions, web app, multi-language (Tagalog v2), password/2FA auth, detailed team role management beyond admin/editor/viewer, bank integrations, receipt OCR, investment/crypto tracking, multi-account switching (flagged in DATABASE_SCHEMA.md as a Phase 1 scope decision), iOS Detox coverage (unless a Mac becomes available sooner).

## Definition of done for Phase 1
Matches the original spec's success definition: add/view/edit/delete expenses offline, categorize, set budgets with alerts, view charts/reports, attach receipt photos, export CSV, sharing configurable on/off, quality gates pass, ready for store submission.
