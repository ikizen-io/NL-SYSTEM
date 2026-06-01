# Workflows

## Inventory

### Add SKU

Route: `src/app/(app)/inventory/new/page.tsx`

Purpose: define a sellable SKU/variant. This does not change stock.

Fields:

- SKU
- Size
- Brand
- Category
- Product model
- Color / variant
- Target price

Brand/category use dropdowns with `+ Add new...` via `CategoryBrandFields.tsx`. Errors show inline; success uses a toast.

### Edit SKU

Route: `src/app/(app)/inventory/[sku]/edit/page.tsx`

Allows editing active SKU details:

- Brand, category, product model, size, color, target price
- Latest StockIn unit cost and extra cost
- Stock-in history panel for that SKU

Editing latest stock-in cost affects current/future costing display, but does not rewrite `InvoiceItem.unitCostAtSale` on historical invoices.

### Remove / Restore SKU

Actions: `removeSku()`, `restoreSku()` in `src/app/(app)/inventory/actions.ts`

Remove behavior:

- If SKU has no stock-ins, adjustments, or invoice items: delete it.
- If SKU has history: archive it (`active=false`) after confirmation.

Restore sets `active=true` again for archived SKUs from the inventory table.

### Receive Stock

Route: `src/app/(app)/inventory/receive/page.tsx`

Purpose: increase stock for existing active SKUs (multi-line supported).

Fields per line: SKU, qty, unit cost. Header fields: date, supplier, purchase reference, extra cost, notes.

Supplier uses `SupplierField.tsx` (select active suppliers or create inline). SKU picker uses the shared combobox.

### Stock-In History

Global: `src/app/(app)/inventory/stock-ins/page.tsx`

Shows recent stock-in batches across all SKUs with search (SKU, brand, model, supplier, purchase ref). Limited to the most recent 500 records.

Per-SKU: stock-in table on the edit SKU page (`StockInHistory.tsx`).

### Suppliers

Route: `src/app/(app)/inventory/suppliers/page.tsx`

Allows:

- create supplier
- rename supplier
- update notes
- remove supplier (confirm dialog)
- restore archived supplier

Remove behavior:

- unused supplier: delete
- supplier used by stock-ins: archive

### Adjust Stock

Route: `src/app/(app)/inventory/adjust/page.tsx`

Purpose: correct quantity after a manual count, damage, loss, or found stock.

The owner enters counted stock. The app calculates:

```text
qtyDelta = countedQty - currentStock
```

Then creates a `StockAdjustment`. Inline errors and success toast.

## Sales

Route: `src/app/(app)/sales/page.tsx`

### New Sale

- customer (combobox with autofill from existing customers)
- payment method and optional payment amount
- one or more active in-stock SKUs (combobox picker)
- qty and unit price per line

The form warns on oversell before submit. Server action `createSale()` validates stock and payment limits. Success resets the form and shows a toast.

### Sales Ledger Filters

Query params via `SalesLedgerFilters.tsx` and `src/lib/sales-filters.ts`:

- search (invoice no / customer name)
- date from / to
- status (all, issued, cancelled, returned, paid, pending)
- customer name
- payment method

Pagination is server-side after filtering.

### Invoice Detail

Route: `src/app/(app)/sales/[invoice]/page.tsx`

Tabbed layout (`InvoiceDetailTabs.tsx`):

- **Overview** — line items and totals
- **Edit** — customer, items, shipping, discount (`InvoiceEditForm.tsx`)
- **Payments** — payment list, add payment, invoice status (`PaymentManager`, `InvoiceStatusPanel`)

`addPayment()` and `deletePayment()` use friendly errors and toasts. Delete payment requires confirmation.

Print: `/invoices/[invoice]/print`

### Returns / Exchanges

Route: `src/app/(app)/sales/[invoice]/page.tsx` → **Returns** tab

On issued invoices:

- return one or more line items (qty ≤ still returnable)
- choose whether to restock (default yes)
- optionally add exchange SKUs (new invoice lines on same invoice)
- optionally record refund amount/method/reference (audit trail)

Creates `ReturnRecord`, `ReturnItem`, and optional `ExchangeItem` rows. Restock uses `StockAdjustment` with reason `Customer return`.

Full invoice return: Payments tab → set status to **Returned (full invoice)** — restocks remaining qty and reverses revenue.

Invoices with return history cannot be rewritten from the Edit tab.

## Customers

List: `src/app/(app)/customers/page.tsx`

Profile: `src/app/(app)/customers/[customer]/page.tsx`

- edit contact fields (phone, Instagram, address, notes)
- lifetime spend and outstanding balance
- invoice history with links back to invoice detail

Customers are still created/updated by name during sale; the profile page enriches the record afterward.

## Dashboard

Route: `src/app/(app)/dashboard/page.tsx`

Modes:

- Month
- Date range (custom from/to)
- Quick presets: Today, Last 7/30/90/365 days, This FY (`DashboardPresets.tsx`)

Shows revenue, COGS, gross profit, margin, expenses, net profit, and recent invoices for the selected period.

## Reports

Route: `src/app/(app)/reports/page.tsx`

Read-only snapshots:

- **Outstanding** — issued invoices with balance due
- **Low stock** — active SKUs at ≤ 1 unit
- **Inventory valuation** — on-hand units × latest effective unit cost

Uses shared helpers from `src/lib/inventory.ts` and `src/lib/invoices.ts`.

## Expenses

Route: `src/app/(app)/expenses/page.tsx`

Simple add/list page. Form uses inline errors and success toast.

## Imports

Route: `src/app/(app)/import/page.tsx`

Currently supports:

- inventory CSV
- expenses CSV

Sales import is not implemented. Import failures may still throw rather than show inline form errors.

## Backup & Export

Route: `src/app/(app)/backup/page.tsx`

**Database**

- Download current SQLite file (`GET /api/backup/database`)
- Save timestamped copy to `backups/` (same pattern as `tools/backup-database.bat`)
- UI shows latest backup file and warns if none exists or last backup is older than 7 days

**CSV exports** (`GET /api/export/[dataset]`)

- variants (with stock and cost)
- stock-ins
- invoices
- invoice-items
- payments
- expenses
- customers

CSV exports are read-only snapshots. Use Import for structured inventory/expense loads.

Restoring a `.db` backup: stop the app, replace `prisma/dev.db`, restart.
