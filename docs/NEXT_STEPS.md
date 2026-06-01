# Next Steps and Known Gaps

This file tracks what is still open. For what already ships, see `docs/PROJECT_HANDOFF.md`.

## Phase F — Reliability & Friendly Errors

Most owner-facing forms use `useActionState`, inline `ActionStateBanner` errors, and success toasts.

**Already covered:** new sale, add payment, delete/update payment, expenses, suppliers (add/update/remove), stock adjust, create/edit SKU, receive stock, customer edit, confirm-dialog destructive actions, invoice status panel, process return.

**Still to convert:**

- CSV import (`import/actions.ts`) — parse/validation failures can show a dev error overlay; forms need client `useActionState` wrappers.

Recommended pattern:

```ts
export type ActionState = { ok?: boolean; error?: string; imported?: number };
```

Return `{ error }` from server actions; show inline errors in the form; use toasts only for success.

## Phase G — Canonical Comboboxes

Customer selection and SKU pickers already use the shared `Combobox` component. Brand, category, and supplier inputs still use `Select` + `__NEW__` inline sentinel.

Build a `CreatableCombobox` that:

- type-to-filter existing options
- keyboard navigation
- shows `Create "value"` row when search text is new
- passes the typed value directly (no `__NEW__` sentinel)

Apply to:

- Brand and Category in `CreateSkuForm` and `EditSkuForm`
- Brand and Category in new-product lines of `ReceivePurchaseForm`

Supplier in receive purchase already uses `Combobox` + inline text field; that can stay as-is or be upgraded.

## Phase H — Reports Expansion

Implemented at `/reports`:

- outstanding balances (issued invoices with balance > 0)
- low stock (active SKUs at ≤ 1 unit)
- inventory valuation

To add:

- cash received vs revenue
- product profitability (brand/model: revenue, COGS, GP, qty sold)
- expenses by category

## Phase I — Sales Filter + Dashboard Enhancements

Sales Ledger filters implemented: date range, status, customer, payment method, search, pagination.

To add:

- brand / category filters on the Sales Ledger (filter by items that belong to that brand/category)

Dashboard presets ship. Future improvement:

- comparison to prior period (same length range offset back)

## Phase J — Quality & Release Hardening

- Automated tests for core business math:
  - `invoiceFinancials` (partial/full returns, cancelled)
  - `currentStock` with adjustments and returns
  - payment balance constraints
- Formal Prisma migration baseline (replace `db push` with tracked migration files).
- Simple single-owner auth: middleware + login page using `AUTH_USERNAME`/`AUTH_PASSWORD`/`AUTH_SECRET` env vars.

## Phase K — Deployment (Vercel + Supabase)

- Migrate production DB from SQLite to Supabase Postgres.
- Prisma datasource switch + schema migration to Postgres.
- Data migration plan: export SQLite → seed Supabase.
- Vercel project setup, env vars, build/deploy checklist.
- Production-safe backup strategy (CSV exports replace `.db` download on hosted env).
- Full runbook in `docs/DEPLOYMENT.md`.

## Technical Debt (ongoing)

- No automated tests yet (Phase J).
- Prisma changes done via `db push`; switch to migrations before Phase K.
- Sales CSV import not implemented (inventory + expenses import only).
- Local auth not implemented yet (Phase J).

## Audit Trail Principles

Financial/inventory records are append-only:

- Sales cost snapshots stored on `InvoiceItem`.
- Stock corrections use `StockAdjustment`.
- Returns use `ReturnRecord` / `ReturnItem`.
- SKU/supplier archive instead of delete when they have history.

## Completed

| Area | Route / location |
|------|------------------|
| Customer CRM | `/customers`, `/customers/[customer]` |
| Sales filters | `SalesLedgerFilters.tsx`, `src/lib/sales-filters.ts` |
| Dashboard presets | `DashboardPresets.tsx` |
| Stock-in history | `/inventory/stock-ins`, per-SKU panel on edit page |
| Reports hub | `/reports` |
| Backup & export | `/backup`, `/api/backup/database`, `/api/export/[dataset]` |
| Partial returns / exchanges | `/sales/[invoice]` Returns tab, `ReturnRecord` models |
| Archive restore | `restoreSku`, `restoreSupplier`, `RestoreButton` |
| Confirm dialogs | `ConfirmActionForm` for destructive actions |
| Invoice status friendly errors | `InvoiceStatusPanel` uses `useActionState` |
