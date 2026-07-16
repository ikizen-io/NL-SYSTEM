# Next Steps and Known Gaps

This file tracks what is still open. For what already ships, see `docs/PROJECT_HANDOFF.md`.

## Audit remediation (Jul 2026)

Shipped from the critical-bug / major-UX audit:

- Full status `RETURNED` no longer double-restocks (no stock adjustments on status flip).
- Void blocked when returns exist or unrefunded payments remain; ledger void uses confirm dialog.
- Cumulative refunds capped; payment add/edit uses balance including refunds.
- Inventory CSV skips existing SKUs (no silent stock doubling).
- Ledger shows Refunded + refund-due; Returns form suggests refund amount.
- Customer link from invoice detail uses `customerSlug`; mobile global search icon.
- Reports cash is net of refunds; DB `RETURNED` financials align with full returns (revenue 0).
- `AUTH_SECRET` fails closed when auth is enabled; login rate limiting.
- Per-SKU `reorderPoint` (default 1); invoice `isPreOrder` persisted + badge.
- Print invoice uses net returns / refunds math.

## Backlog / Not Yet Scheduled

- Scheduled/automated backup job (beyond manually visiting `/backup` or relying on Supabase PITR).
- **Prisma migration history drift**: the live DB is synced via `prisma db push`, not `prisma migrate deploy`. To re-baseline without losing data:

  1. Ensure schema matches production: `npx prisma db push`
  2. Mark existing folders as applied (do **not** re-run SQL):  
     `npx prisma migrate resolve --applied 20260429132702_init`  
     (and each subsequent migration folder that matches the live schema)
  3. Only then use `prisma migrate dev` for *new* changes — or keep using `db push` + hand-written `migration.sql` docs.

  The first migration file was written for SQLite; until history is re-baselined this way, prefer `db push`.

## Audit Trail Principles

Financial/inventory records are append-only:

- Sales cost snapshots stored on `InvoiceItem`.
- Stock corrections use `StockAdjustment`.
- Returns use `ReturnRecord` / `ReturnItem`.
- SKU/supplier archive instead of delete when they have history.
