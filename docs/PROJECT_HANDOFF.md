# Project Handoff

## Product Context

This app is a simple owner-operated ERP/CRM for Nitro Labs, a sportswear shop. It replaces a Google Sheets setup with tabs for Dashboard, Sales Ledger, Inventory, Expenses, and Insights.

The owner is the only intended user for now. Prioritize fast data entry, clear financial totals, and simple auditability over enterprise complexity.

## Current Status

Deployed to production on Vercel, backed by Supabase Postgres, behind a single-owner login gate. This is not a local-only prototype anymore.

### Core modules (original scope)

- Dashboard with month mode, custom date range, always-visible quick presets (Today, 7/30/90/365 days, This FY).
- Sales Ledger with invoice creation, multi-item invoices, payments, status updates, search, pagination, and filters (date range, status, customer, payment method, brand, category).
- Invoice detail with tabbed Overview / Edit / Payments / Returns (status controls live on the Payments tab).
- Inventory SKU catalog with active/archive behavior, search, and restore for archived SKUs.
- SKU add/edit/remove flows with a creatable combobox for brand/category (type to filter, or create a new value inline — no separate "custom" field).
- Color/variant support for SKUs.
- Receive Stock with supplier, purchase reference, unit cost, extra landed cost, and notes; supports both existing SKUs and inline new-product lines.
- Supplier management as first-class records, with archive/restore behavior.
- Stock adjustment page for manual count corrections.
- Expenses entry and listing.
- Insights by brand and top customers.
- CSV import for inventory and expenses, with friendly inline errors and per-row skip reasons (invalid rows are reported, not silently dropped).
- Global search (Ctrl/Cmd+K or the header button) across customers, invoices, and SKUs.
- Optional SKU/variant photos: upload, replace, or remove on Create/Edit SKU, with thumbnails in the inventory table and the SKU picker comboboxes.

### Reliability & UX

- `useActionState` + inline errors (`ActionStateBanner`) + success toasts on all owner-facing forms, including CSV import.
- Confirmation dialogs for destructive actions (delete payment, archive/remove SKU or supplier).
- Sticky table headers on large tables.
- Customer combobox with autofill in New Sale and Invoice Edit.
- New Sale oversell warning, pre-order mode (bypasses the stock gate for advance sales), form reset, and toast-only success.
- Print invoice view with polished styling, print-safe colors, and page-break handling so standard invoices stay on one page (long invoices push Payment Information/Contact/footer to page 2 as a block).

### Customers (CRM)

- `/customers` list with search.
- `/customers/[customer]` profile with edit form (phone, Instagram, address, notes).
- Lifetime spend, outstanding balance, and invoice history on the profile.
- Links from Sales Ledger and customer fields to open profiles.

### Payments

- Payment methods: Bank, Cash, COD, Transfer, KOKO Pay, Other (`src/lib/payment-methods.ts`).
- Invoices carry an optional `preferredPaymentMethod`, editable on the invoice detail page and set at sale creation.

### Inventory & reports

- Global stock-in history at `/inventory/stock-ins` with search.
- Per-SKU stock-in history panel on the edit page, with supplier/details editable per batch.
- Shared inventory helpers in `src/lib/inventory.ts` (current stock, valuation rows) — covered by unit tests.
- Reports hub at `/reports`: outstanding balances, low stock (flat threshold, see Next Steps), inventory valuation, cash received vs. revenue, product profitability by brand/model, expenses by category.

### Returns & exchanges

- Invoice detail **Returns** tab: line-level returns, optional restock, exchanges, refund audit.
- Full invoice return via status control restocks remaining qty and creates return records.
- Net revenue/COGS/balance adjust automatically across dashboard, sales ledger, reports, and insights.

### Backup & export

- `/backup` page with CSV exports (works in every environment) and SQLite-only DB download (local dev convenience, disabled against Postgres).
- API routes: `/api/backup/database`, `/api/export/[dataset]`.
- Desktop script still available for local SQLite backups: `tools/backup-database.bat`.

### Auth & infrastructure

- Single-owner login gate: `src/middleware.ts` + `src/lib/auth.ts`, signed session cookie, `AUTH_USERNAME`/`AUTH_PASSWORD`/`AUTH_SECRET` env vars.
- Production database is Supabase Postgres. Schema changes ship via `prisma db push` plus a hand-written `prisma/migrations/<name>/migration.sql` for documentation — `prisma migrate dev`/`deploy` are currently blocked by migration-history drift (see `docs/NEXT_STEPS.md`).
- Unit tests (`vitest`) cover invoice financials, returns math, stock derivation, unit costing, and the Sales Ledger filter/query builder.
- Optional SKU/variant photos via Supabase Storage (`sku-photos` bucket, `src/lib/storage.ts`) — needs `SUPABASE_URL`/`SUPABASE_STORAGE_KEY` set or the upload UI just no-ops.

## Important User Preferences

- UI/UX should be polished, minimal, and suitable for a sportswear SME.
- Avoid noisy explanatory text in the app.
- Use professional placeholders, but keep Nitro Labs/sportswear examples where useful.
- Workflows should be clear to a non-technical owner.
- Avoid mixing concepts on one form: SKU setup, receiving stock, supplier management, and stock adjustments should remain separate flows.
- Financial/inventory history is append-only — prefer archiving/adjusting records over deleting them.

## Run Commands

```bash
npx next dev --port 3005
npm run build
npm run test
npx prisma db push
```

Production-style local run (serves the last build):

```bash
npm run build
npm run start
```

## Windows Notes

If PowerShell blocks `npm` with a script execution policy error, use `npm.cmd` instead:

```powershell
npm.cmd run build
npm.cmd run start
```

If Prisma client generation fails with `EPERM` for `query_engine-windows.dll.node`, the Next dev server or another `node.exe` process is locking it.

Typical recovery:

1. Stop the Next dev server.
2. If needed, find/kill the process using port 3005.
3. Run `npx prisma db push` or `npx prisma generate`.
4. Restart `npx next dev --port 3005`.

## Recent Bug Fix Context

Add SKU previously failed after the first SKU because optional hidden/custom fields (`brandCustom`, `categoryCustom`, `color`) arrived as `null`. The fix is the `optionalText()` preprocessing helper in `src/app/(app)/inventory/actions.ts`.

Do not remove this normalization unless replacing it with an equivalent form-state strategy.

## What Is Not Done Yet

See `docs/NEXT_STEPS.md` for the full backlog. Highest-impact remaining items:

- Per-SKU/variant reorder point for a smarter low-stock report (currently a flat "≤ 1 unit" threshold for every SKU). Explicitly deferred by product decision, not forgotten.
- Dashboard period-over-period comparison.
- Re-baselining the Prisma migration history so `prisma migrate dev`/`deploy` work again (currently using `prisma db push`).
