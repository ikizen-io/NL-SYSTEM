# Project Handoff

## Product Context

This app is a simple owner-operated ERP/CRM for Nitro Labs, a sportswear shop. It replaces a Google Sheets setup with tabs for Dashboard, Sales Ledger, Inventory, Expenses, and Insights.

The owner is the only intended user for now. Prioritize fast data entry, clear financial totals, and simple auditability over enterprise complexity.

## Current Status

### Core modules (original scope)

- Dashboard with month mode, custom date range, and quick presets (Today, 7/30/90/365 days, This FY).
- Sales Ledger with invoice creation, multi-item invoices, payments, status updates, search, pagination, and filters.
- Invoice detail with tabbed Overview / Edit / Payments (status controls live on the Payments tab).
- Inventory SKU catalog with active/archive behavior, search, and restore for archived SKUs.
- SKU add/edit/remove flows with brand/category dropdowns on create and edit.
- Color/variant support for SKUs.
- Receive Stock with supplier, purchase reference, unit cost, extra landed cost, and notes.
- Supplier management as first-class records, with archive/restore behavior.
- Stock adjustment page for manual count corrections.
- Expenses entry and listing.
- Insights by brand and top customers.
- CSV import for inventory and expenses.

### Added in recent UI / feature phases

**Reliability & UX**

- `useActionState` + inline errors + success toasts on most owner-facing forms.
- Confirmation dialogs for destructive actions (delete payment, archive/remove SKU or supplier).
- Sticky table headers on large tables.
- Customer combobox with autofill in New Sale and Invoice Edit.
- New Sale oversell warning, form reset, and toast-only success.
- Print invoice view with polished badge styling.

**Customers (CRM)**

- `/customers` list with search.
- `/customers/[customer]` profile with edit form (phone, Instagram, address, notes).
- Lifetime spend, outstanding balance, and invoice history on the profile.
- Links from Sales Ledger and customer fields to open profiles.

**Sales & dashboard**

- Sales Ledger filters: date range, status (including paid/pending), customer, payment method.
- Shared invoice financial helpers in `src/lib/invoices.ts`.

**Inventory & reports**

- Global stock-in history at `/inventory/stock-ins` with search.
- Per-SKU stock-in history panel on the edit page.
- Shared inventory helpers in `src/lib/inventory.ts` (current stock, valuation rows).
- Reports hub at `/reports`: outstanding balances, low stock, inventory valuation.

**Returns & exchanges**

- Invoice detail **Returns** tab: line-level returns, optional restock, exchanges, refund audit.
- Full invoice return via status control restocks remaining qty and creates return records.
- Net revenue/COGS/balance adjust automatically across dashboard, sales ledger, reports, and insights.

**Backup & export**

- `/backup` page with SQLite download, save-to-`backups/` action, last-backup reminder.
- CSV exports: variants, stock-ins, invoices, invoice-items, payments, expenses, customers.
- API routes: `/api/backup/database`, `/api/export/[dataset]`.
- Desktop script still available: `tools/backup-database.bat`.

## Important User Preferences

- UI/UX should be polished, minimal, and suitable for a sportswear SME.
- Avoid noisy explanatory text in the app.
- Use professional placeholders, but keep Nitro Labs/sportswear examples where useful.
- Workflows should be clear to a non-technical owner.
- Avoid mixing concepts on one form: SKU setup, receiving stock, supplier management, and stock adjustments should remain separate flows.

## Run Commands

```bash
npx next dev --port 3005
npm run build
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

- True combobox for brand/category/supplier with `Create "value"` (basic combobox exists for customers and SKU pickers).
- Additional reports (cash vs revenue, profitability, expenses by category).
- Friendly errors for CSV import and invoice status save.
- Auth, automated tests, and formal Prisma migrations before any non-local deployment.
