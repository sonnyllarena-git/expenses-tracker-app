# Database Schema — Expense Tracker (Local SQLite via Drizzle ORM)

All tables live in a single on-device SQLite database (`expense-tracker.db`), opened via `expo-sqlite` and wrapped by `drizzle-orm/expo-sqlite`. Table definitions live in `src/db/schema.ts`; this document explains the entities and the product decisions baked into them. Column names use `snake_case` per agent.md.md's naming convention; TypeScript types generated from the schema use `camelCase`.

This adapts the original spec's schema with the six open product questions resolved (see ARCHITECTURE.md ADRs and the notes inline below).

## Entities

### `users` (single local profile row in Phase 1)
| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID), PK | |
| `email` | text, nullable | Phase 1 has no auth server; optional, local only |
| `account_type` | text | `personal` \| `family` \| `business` |
| `currency` | text | default `PHP`. **One currency per account** (not per-expense) — matches the original spec's schema placement of `currency` on the user record. |
| `sharing_enabled` | integer (bool) | default `0` |
| `notifications_enabled` | integer (bool) | default `1` |
| `budget_alerts_enabled` | integer (bool) | default `1` |
| `created_at` | text (ISO8601) | |

**Decision:** Phase 1 supports exactly one active `users` row per install (one account per app). Multi-account switching, implied by "Premium: unlimited accounts" in the spec, is deferred to Phase 2 and requires a UI account-switcher plus per-account DB scoping — flagged here explicitly rather than half-built.

### `categories`
| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID), PK | |
| `user_id` | text, FK → users.id | |
| `name` | text | |
| `icon` | text | icon name (from the icon set the UI uses) |
| `color` | text | hex |
| `is_custom` | integer (bool) | `0` for the 7 pre-defined categories, `1` for user-created |
| `created_at` | text (ISO8601) | |

Pre-defined seed set (Week 1, seeded on first launch): Food, Transport, Entertainment, Utilities, Health, Shopping, Other — see `src/constants/categories.ts`.

### `expenses`
| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID), PK | |
| `user_id` | text, FK → users.id | |
| `added_by_user_id` | text, FK → users.id, nullable | **Added beyond the original spec.** Supports "member contribution tracking" for family sharing — records which family member logged the expense. Nullable because it's meaningless outside `family` account type. |
| `amount` | real | positive, validated at the form layer |
| `category_id` | text, FK → categories.id | |
| `date` | text (ISO8601) | |
| `description` | text | |
| `tags` | text (JSON array) | SQLite has no native array type; stored as a JSON string, parsed at the query layer |
| `receipt_photo_path` | text, nullable | local filesystem path; see "Receipt photos" below |
| `is_recurring` | integer (bool) | see "Recurring expenses" below |
| `recurring_frequency` | text, nullable | `daily` \| `weekly` \| `monthly`, required if `is_recurring` |
| `recurring_template_id` | text, nullable, self-referencing FK → expenses.id | Set on rows *generated from* a template, pointing back at the template row. Null on the template row itself and on ordinary one-off expenses. |
| `budget_id` | text, FK → budgets.id, nullable | |
| `created_at` / `updated_at` | text (ISO8601) | |

**Recurring expenses — decision:** a recurring expense is created as a *template row* (`is_recurring = 1`, `recurring_frequency` set, `recurring_template_id = null`). On each app launch, a due-check materializes real dated `expenses` rows from any template whose next occurrence has arrived, each with `recurring_template_id` pointing back at the template. This keeps reports/aggregates working over real rows (a virtual/computed-only approach would complicate every report query) while keeping one editable place (the template) to change future occurrences. Implementation lands in the Weeks 5-7 core-logic phase, not Week 1.

**Receipt photos — decision:** on save, a photo is copied into the app's document directory as `receipt_<expenseId>_<timestamp>.jpg` and that path is stored in `receipt_photo_path`. No OCR, no automatic content labeling — just a timestamped, expense-linked file.

### `budgets`
| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID), PK | |
| `user_id` | text, FK → users.id | |
| `category_id` | text, FK → categories.id | |
| `limit_amount` | real | |
| `month` | text | `YYYY-MM` |
| `alert_threshold` | real | e.g. `0.8` = alert at 80% spent |
| `created_at` | text (ISO8601) | |

One budget per category per month. Scoped to the single active account (see `users` decision above) — not separate parallel budget sets for Personal vs Family, since Phase 1 has one account per install.

### `family_members` (only relevant when `account_type = family` and `sharing_enabled = 1`)
| Column | Type | Notes |
|---|---|---|
| `id` | text (UUID), PK | |
| `family_id` | text | groups members; equals the owning `users.id` for Phase 1's single-account model |
| `user_id` | text, FK → users.id | |
| `role` | text | `admin` \| `editor` \| `viewer` |
| `joined_at` | text (ISO8601) | |

Phase 1 scope: local role storage + `expenses.added_by_user_id` attribution only. Actual multi-device sharing/sync (inviting a real second device) requires a backend and is Phase 2 — the schema exists now so the sync layer isn't a schema migration later, but the invite/sync flow itself is not built in Phase 1.

## Indexes (Week 1)
- `expenses(user_id, date)` — list/filter by date range
- `expenses(user_id, category_id)` — category breakdown reports
- `budgets(user_id, month)` — budget-vs-actual lookups

## Migrations
Generated via `drizzle-kit generate` from `src/db/schema.ts`, output committed to `src/db/migrations/`, applied at app startup via Drizzle's `useMigrations` hook (mobile apps can't read migration files off disk at runtime — they're bundled JS/asset imports). Every schema change in Weeks 2-11 means: edit `schema.ts` → regenerate → commit the migration.
