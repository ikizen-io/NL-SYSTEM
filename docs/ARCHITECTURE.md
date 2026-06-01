# Architecture

## App Structure

Main app routes live under `src/app/(app)/`.

| Route | Purpose |
|-------|---------|
| `dashboard/` | Summary reports by month, date range, or preset |
| `sales/` | Sales Ledger, new sale, invoice detail |
| `customers/` | Customer list and profiles |
| `inventory/` | SKU catalog, receive, suppliers, adjust, stock-in history |
| `reports/` | Outstanding balances, low stock, valuation |
| `expenses/` | Expense entry and listing |
| `insights/` | Brand and customer aggregations |
| `import/` | CSV import for inventory and expenses |
| `backup/` | SQLite backup and CSV export downloads |

Print layout (no app shell): `src/app/invoices/[invoice]/print/`.

API routes:

- `src/app/api/backup/database/route.ts` — download SQLite file
- `src/app/api/export/[dataset]/route.ts` — CSV export by dataset name

Shared code:

- `src/components/AppShell.tsx` — shell, sidebar, header, quick actions
- `src/components/ui/*` — UI primitives (including `confirm-action`, `restore-button`, `customer-fields`, `combobox`)
- `src/lib/prisma.ts` — Prisma client singleton
- `src/lib/format.ts` — currency, percentage, invoice formatting
- `src/lib/costing.ts` — effective unit cost calculation
- `src/lib/inventory.ts` — current stock, inventory rows, valuation
- `src/lib/invoices.ts` — invoice totals, balance, customer slug helpers
- `src/lib/sales-filters.ts` — Sales Ledger filter parsing and query building
- `src/lib/backup.ts` — database path resolution, local backup copy, last-backup info
- `src/lib/export-data.ts` — CSV dataset builders
- `src/lib/csv.ts` — CSV escaping helpers
- `prisma/schema.prisma` — SQLite schema

## Tech Decisions

- Next.js server components are used for page data loading.
- Server actions are used for mutations.
- SQLite is used as the local single-owner database.
- Prisma 6 is used instead of Prisma 7 to keep classic SQLite config and `@prisma/client` imports.
- Amounts are stored as integer LKR values.
- Success feedback uses Sonner toasts; errors prefer inline banners via `useActionState`.

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
- `Invoice`: invoice number, issued date, status, shipping, discount.
- `InvoiceItem`: SKU, qty, unit price, `unitCostAtSale` snapshot.
- `Payment`: invoice payments, method, amount, reference.
- `ReturnRecord`: partial/full return header on an invoice (date, refund, notes).
- `ReturnItem`: qty returned per invoice line, with optional restock flag.
- `ExchangeItem`: replacement SKU sold on the same invoice during a return.

Expenses:

- `Expense`: date, category, description, amount, payment method, notes.

## Inventory Math

Current stock is derived, not stored. Implementation: `currentStock()` in `src/lib/inventory.ts`.

```text
stock = sum(StockIn.qty) + sum(StockAdjustment.qtyDelta) - sum(ISSUED invoice item qty)
```

`RETURNED` invoices are treated as reversed revenue/profit in reporting. Marking an invoice returned also restocks remaining qty via `StockAdjustment` and creates a `ReturnRecord` audit entry.

Partial returns on `ISSUED` invoices use `ReturnRecord` / `ReturnItem`. Restocked units flow back through `StockAdjustment`. Net revenue/COGS use returned qty; exchange lines add new `InvoiceItem` rows on the same invoice.

## Costing

`effectiveUnitCost()` in `src/lib/costing.ts`:

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

- Live database: `prisma/dev.db` (from `DATABASE_URL="file:./dev.db"`).
- Local backup copies: `backups/dev_YYYYMMDD-HHMMSS.db`.
- Desktop helper: `tools/backup-database.bat` (same destination folder as in-app save).
