# Next Steps and Known Gaps

This file tracks what is still open. For what already ships, see `docs/PROJECT_HANDOFF.md`.

This is being worked through as the "Phased ERP Polish Upgrade" plan, in order:

1. Correctness & test coverage (this phase)
2. Recurring UX friction (global search, supplier picker consistency)
3. Product photos per SKU
4. Dashboard period-over-period comparison

## Phase 1 — Correctness & Test Coverage

- [x] Unit tests for `currentStock()` / `computeInventoryRow()` (`src/__tests__/inventory.test.ts`).
- [x] Unit tests for `effectiveUnitCost()` (`src/__tests__/costing.test.ts`).
- [x] Unit tests for the Sales Ledger filter/query builder (`src/__tests__/sales-filters.test.ts`).
- [x] CSV import now reports skipped-row counts and reasons instead of silently dropping invalid rows (`ImportActionState.skipped` / `skipReasons`).
- [x] Refreshed README/PROJECT_HANDOFF/ARCHITECTURE/NEXT_STEPS to match the actual Postgres + auth + migrations + tests state.

## Phase 2 — Recurring UX Friction

- [ ] Global search (Cmd+K / Ctrl+K) across customers, invoices, and SKUs, built on the existing `cmdk`-based `Command` primitives.
- [ ] Migrate the Supplier picker in `ReceivePurchaseForm.tsx` from `Combobox` + `__NEW__` sentinel to the shared `CreatableCombobox` (already used for Brand/Category everywhere) for one consistent pattern.

## Phase 3 — Product Photos

- [x] Added an optional `Variant.imageUrl` field via Prisma schema + migration.
- [x] Storage: Supabase Storage, using the existing project's own `sku-photos` bucket (public read, anon-scoped insert/update/delete via RLS policies limited to that one bucket — see `src/lib/storage.ts`). Implemented against the plain Storage REST API via `fetch`, so no new npm dependency was needed.
- [x] Upload UI (with preview, replace, and remove) on Create/Edit SKU forms.
- [x] Thumbnails in the inventory table and the SKU picker comboboxes (New Sale, Receive Purchase). Printable invoice line-item thumbnails were left out (explicitly optional in the plan, and would add visual noise to a document meant to stay compact).
- Note: `SUPABASE_URL` / `SUPABASE_STORAGE_KEY` must be set (see `.env.example`) or the upload UI silently no-ops (SKU save still succeeds without a photo).

## Phase 4 — Dashboard Period Comparison

- [ ] "vs previous period" delta badges on dashboard stat cards (same-length range immediately preceding the selected one).

## Backlog / Not Yet Scheduled

- **Low-stock threshold**: currently a flat "≤ 1 unit" cutoff in `/reports` (`src/app/(app)/reports/page.tsx`) for every SKU. A per-variant reorder point would make the report meaningful for fast- vs. slow-moving sizes/colorways. Explicitly deferred — revisit when prioritizing inventory depth again.
- Rate limiting / login attempt throttling on `/api/auth/login`.
- Scheduled/automated backup job (beyond manually visiting `/backup` or relying on Supabase PITR).
- **Prisma migration history drift**: `prisma migrate status` shows none of the 3 existing migrations as applied against the live DB — the actual schema was kept in sync via `prisma db push` (and/or direct SQL), not `prisma migrate deploy`. `migration_lock.toml` had also drifted to say `sqlite` (fixed alongside the `imageUrl` migration). `prisma migrate dev` won't work cleanly until the very first migration (`20260429132702_init`, written for SQLite) is rewritten for Postgres or the migration history is re-baselined with `prisma migrate resolve`. Until then, keep using `prisma db push` for schema changes and hand-write the matching `migration.sql` file for history/documentation.

## Audit Trail Principles

Financial/inventory records are append-only:

- Sales cost snapshots stored on `InvoiceItem`.
- Stock corrections use `StockAdjustment`.
- Returns use `ReturnRecord` / `ReturnItem`.
- SKU/supplier archive instead of delete when they have history.

## Already Shipped (do not re-plan these)

| Area | Route / location |
|------|------------------|
| Postgres + tracked migrations | `prisma/schema.prisma`, `prisma/migrations/` |
| Single-owner auth | `src/middleware.ts`, `src/lib/auth.ts` |
| Customer CRM | `/customers`, `/customers/[customer]` |
| Sales filters (incl. brand/category) | `SalesLedgerFilters.tsx`, `src/lib/sales-filters.ts` |
| Dashboard presets | `DashboardFilters.tsx` |
| Creatable combobox for Brand/Category | `src/components/ui/creatable-combobox.tsx`, used in `CreateSkuForm`, `EditSkuForm`, `ReceivePurchaseForm` |
| Stock-in history | `/inventory/stock-ins`, per-SKU panel on edit page |
| Reports hub (outstanding, low stock, valuation, cash vs. revenue, profitability, expenses by category) | `/reports` |
| Backup & export | `/backup`, `/api/backup/database`, `/api/export/[dataset]` |
| Partial returns / exchanges | `/sales/[invoice]` Returns tab, `ReturnRecord` models |
| Archive/restore | `restoreSku`, `restoreSupplier`, `RestoreButton` |
| Confirm dialogs | `ConfirmActionForm` for destructive actions |
| Friendly errors everywhere, incl. CSV import | `useActionState` + `ActionStateBanner` on all owner-facing forms |
| Unit tests for core business math | `src/__tests__/` |
