# Architecture

## App Structure

Main app routes live under `src/app/(app)/`.

| Route | Purpose |
|-------|---------|
| `dashboard/` | Summary reports by month, date range, or preset |
| `sales/` | Sales Ledger, new sale, invoice detail (Overview/Edit/Payments/Returns tabs) |
| `customers/` | Customer list and profiles |
| `inventory/` | SKU catalog, receive, suppliers, adjust, stock-in history |
| `reports/` | Outstanding balances, low stock, valuation, cash vs. revenue, profitability, expenses by category |
| `expenses/` | Expense entry and listing |
| `insights/` | Brand and customer aggregations |
| `import/` | CSV import for inventory and expenses |
| `backup/` | CSV export downloads (SQLite file download is local-dev only) |

Print layout (no app shell): `src/app/invoices/[invoice]/print/`.

API routes:

- `src/app/api/backup/database/route.ts` — download SQLite file (local dev only; disabled against Postgres)
- `src/app/api/export/[dataset]/route.ts` — CSV export by dataset name
- `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts` — session cookie auth

Auth:

- `src/middleware.ts` — gates every route except `/login` and the auth API routes behind a signed session cookie.
- `src/lib/auth.ts` — session creation/verification, keyed off `AUTH_USERNAME`/`AUTH_PASSWORD`/`AUTH_SECRET`.

Shared code:

- `src/components/AppShell.tsx` — shell, sidebar, header, quick actions
- `src/components/ui/*` — UI primitives (including `combobox`, `creatable-combobox`, `confirm-action`, `restore-button`, `customer-fields`, `command`)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/format.ts` — currency, percentage, invoice formatting
- `src/lib/costing.ts` — effective unit cost calculation
- `src/lib/inventory.ts` — current stock, inventory rows, valuation
- `src/lib/invoices.ts` — invoice totals, balance, customer slug helpers
- `src/lib/returns.ts` — return/exchange math (returned qty, refund totals, full-return detection)
- `src/lib/sales-filters.ts` — Sales Ledger filter parsing and query building
- `src/lib/payment-methods.ts` — shared payment method values/labels (incl. KOKO Pay)
- `src/lib/global-search.ts` + `src/app/api/search/route.ts` + `src/components/GlobalSearch.tsx` — Ctrl/Cmd+K palette across customers, invoices, and SKUs
- `src/lib/storage.ts` — Supabase Storage REST client for SKU photo upload/delete (plain `fetch`, no SDK dependency)
- `src/lib/backup.ts` — database path resolution, local backup copy, last-backup info
- `src/lib/export-data.ts` — CSV dataset builders
- `src/lib/csv.ts` — CSV escaping helpers
- `src/lib/runtime.ts` — detects SQLite vs. Postgres runtime for backup/UI gating
- `prisma/schema.prisma` — PostgreSQL schema
- `prisma/migrations/` — one hand-maintained `migration.sql` per schema change, for history/documentation. The live DB is actually kept in sync via `prisma db push`, not `prisma migrate deploy` — see `docs/NEXT_STEPS.md` for why.

Tests:

- `src/__tests__/` — vitest unit tests for invoice financials, returns math, inventory/costing math, and the Sales Ledger filter builder. All test pure functions; no database required.

## Tech Decisions

- Next.js server components are used for page data loading.
- Server actions are used for mutations.
- PostgreSQL (Supabase) is the database, with `directUrl` configured for Prisma Migrate against the pooled connection.
- Prisma 6 is used instead of Prisma 7 to keep classic config and `@prisma/client` imports.
- Amounts are stored as integer LKR values.
- Success feedback uses Sonner toasts; errors prefer inline banners via `useActionState`.
- Brand/category (and other free-text catalog fields) use a shared `CreatableCombobox` — type to filter existing values, or select "Create '...'" to use a new one directly, with no `__NEW__` sentinel value.

## Data Model Summary

Catalog:

- `Product`: brand/category/model-level grouping.
- `Variant`: SKU-level item, size, optional color, target price, active/archive flag.

Inventory:

- `StockIn`: received batches with qty, unit cost, supplier, purchase ref, extra cost, notes.
- `StockAdjustment`: audit-safe stock corrections via `qtyDelta`.
- `Supplier`: first-class supplier records, active/archive behavior.

Sales:

- `Customer`: unique by name; phone, Instagram, address, notes on profile.
- `Invoice`: invoice number, issued date, status, shipping, discount, optional `preferredPaymentMethod`.
- `InvoiceItem`: SKU, qty, unit price, `unitCostAtSale` snapshot.
- `Payment`: invoice payments, method (incl. KOKO), amount, reference.
- `ReturnRecord`: partial/full return header on an invoice (date, refund, notes).
- `ReturnItem`: qty returned per invoice line, with optional restock flag.
- `ExchangeItem`: replacement SKU sold on the same invoice during a return.

Expenses:

- `Expense`: date, category, description, amount, payment method, notes.

Other:

- `Counter`: sequence storage for generated numbers (e.g. yearly invoice counters).

## Inventory Math

Current stock is derived, not stored. Implementation: `currentStock()` in `src/lib/inventory.ts` (unit-tested in `src/__tests__/inventory.test.ts`).

```text
stock = sum(StockIn.qty) + sum(StockAdjustment.qtyDelta) - sum(ISSUED invoice item qty)
```

`RETURNED` invoices are treated as reversed revenue/profit in reporting. Marking an invoice returned also restocks remaining qty via `StockAdjustment` and creates a `ReturnRecord` audit entry.

Partial returns on `ISSUED` invoices use `ReturnRecord` / `ReturnItem`. Restocked units flow back through `StockAdjustment`. Net revenue/COGS use returned qty; exchange lines add new `InvoiceItem` rows on the same invoice.

## Costing

`effectiveUnitCost()` in `src/lib/costing.ts` (unit-tested):

```text
effective unit cost = unitCost + round(extraCost / qty)
```

Sales snapshot `unitCostAtSale` from the latest StockIn at sale time. Historical sales should not be rewritten when current stock costs are edited later.

## Status Semantics

Invoice statuses:

- `ISSUED`: counts for sales, stock deduction, revenue, COGS, GP.
- `CANCELLED`: neutralized in Sales Ledger/detail totals.
- `RETURNED`: full-invoice reversal in reporting; restocks remaining qty.
- Partial returns on `ISSUED` invoices: use Returns tab; invoice stays issued with adjusted net totals.

Derived payment status (UI only): issued invoices with balance ≤ 0 show as completed; balance > 0 as pending.

Variant `active=false` means archived. Archived SKUs are hidden by default and excluded from receive stock and sales. They can be restored from the inventory list.

Supplier `active=false` means archived. Used suppliers are archived rather than deleted. They can be restored from the suppliers page.

## Backup Layout

- Production: Supabase Postgres. Rely on Supabase's Point-in-Time Recovery (verify enabled in the Supabase dashboard) plus in-app CSV exports for portable snapshots.
- Local dev only: live database at `prisma/dev.db` (SQLite, `DATABASE_URL="file:./dev.db"`), local backup copies at `backups/dev_YYYYMMDD-HHMMSS.db`, desktop helper `tools/backup-database.bat`.
- `src/lib/runtime.ts` detects the active database type so `/backup` hides the SQLite-only download button when running against Postgres.
