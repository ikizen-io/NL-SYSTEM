# Coding Guide

## Before Editing

1. Read `AGENTS.md`.
2. Read `docs/PROJECT_HANDOFF.md`.
3. Read `docs/ARCHITECTURE.md`.
4. For workflow-specific work, read `docs/WORKFLOWS.md`.

## Next.js Notes

This is Next.js 16. Do not assume older App Router behavior without checking current docs or local generated guidance in `node_modules/next/dist/docs/`.

Server components are used for page data loading. Mutations are mostly server actions colocated under route folders.

## UI Patterns

Use existing UI primitives from `src/components/ui/`:

- `Button`, `Card`, `Input`, `Label`, `Select`, `Table`, `Badge`, `Tabs`
- `Page`, `PageHeader`, `PageTitle`, `PageDescription`, `PageActions` from `page.tsx`
- `ActionStateBanner`, `FormSection`, `FormFooter` from `form-patterns.tsx`
- `ConfirmActionForm` for destructive actions that need a dialog
- `RestoreButton` for unarchiving SKUs/suppliers
- `Combobox` for searchable selects (customers, SKUs)
- `CustomerFields` for customer name + contact autofill in sales flows

Prefer improving those primitives over one-off styling.

**Feedback conventions**

- Inline errors: `ActionStateBanner` (errors only on the banner; do not duplicate success there).
- Success: Sonner toast (`toast.success(...)`).
- Destructive actions: `ConfirmActionForm` with explicit confirm copy.

## Mutation Patterns

New user-facing forms should prefer:

```ts
export type ActionState = { ok?: boolean; error?: string };
```

Use `useActionState` in the client form component and return `{ error }` instead of throwing for validation failures.

Existing examples: `CreateSkuForm`, `ReceivePurchaseForm`, `ExpenseForm`, `NewSaleForm`, `StockAdjustForm`, supplier forms, `ConfirmActionForm`.

Exceptions still throwing (fix when touching those areas): CSV import actions, `updateInvoiceStatus`.

## Domain Helpers

Reuse shared logic instead of duplicating aggregates:

- `src/lib/inventory.ts` — `currentStock`, `computeInventoryRow(s)`, valuation
- `src/lib/invoices.ts` — `invoiceFinancials`, `customerSlug`
- `src/lib/sales-filters.ts` — Sales Ledger filter parsing
- `src/lib/costing.ts` — `effectiveUnitCost`
- `src/lib/backup.ts` / `src/lib/export-data.ts` — backup and CSV export

## Inventory Principles

- Do not store current stock directly.
- Derive current stock from stock-ins, adjustments, and issued invoice items.
- Do not delete records with history; archive instead (restore is OK for catalog records).
- Use stock adjustments for corrections.
- Do not rewrite historical invoice costs.

## Sales Principles

- Validate stock before issuing invoices.
- Store cost snapshot in `InvoiceItem.unitCostAtSale`.
- Do not allow payments above invoice balance.
- Keep cancelled invoices neutral in totals.
- Treat current returned logic as full-invoice reversal only.

## Prisma / Windows

Stop the dev server before changing Prisma schema if generation fails with a locked DLL.

Use:

```bash
npx prisma db push
npm run build
```

On PowerShell, if `npm` is blocked, use `npm.cmd run build`.

## Verification

After meaningful changes:

```bash
npm run build
npm run lint
```

Then restart:

```bash
npx next dev --port 3005
```

For production-style local verification:

```bash
npm run build
npm run start
```

Open `http://localhost:3005`. Note: `next start` serves the last build — rebuild after code changes.
