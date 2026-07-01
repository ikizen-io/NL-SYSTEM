# Nitro Labs Owner System

Single-owner web system for Nitro Labs, a sportswear shop, replacing a Google Sheets workflow for sales, CRM/customer history, inventory, suppliers, expenses, dashboard reporting, and insights.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- PostgreSQL (Supabase), via tracked Prisma migrations
- Vitest for unit tests
- Deployed on Vercel

## Local Development

```bash
npm install
npx prisma migrate deploy
npm run dev
```

Open `http://localhost:3000` (or whichever port `next dev` reports).

## Database

Production and local development both point at Postgres (Supabase). Set `DATABASE_URL` and `DIRECT_URL` in `.env` — see `.env.example` for the format.

Schema is in `prisma/schema.prisma`. Migrations are tracked in `prisma/migrations/`.

After schema changes:

```bash
npx prisma migrate dev --name <change-description>
```

To apply existing migrations to a fresh environment:

```bash
npx prisma migrate deploy
```

On Windows, if Prisma generation fails with `EPERM` on the query engine DLL, stop running Node/Next processes first, then rerun `npx prisma generate`.

## Auth

Single-owner login is gated by `src/middleware.ts` using a signed session cookie. Set `AUTH_USERNAME`, `AUTH_PASSWORD`, and `AUTH_SECRET` in your environment to enable it. If `AUTH_PASSWORD` is unset, auth is bypassed (local dev convenience only — always set it in production).

## Tests

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

Covers core financial/inventory math: invoice financials (revenue/COGS/GP, returns), stock derivation, unit costing, and the Sales Ledger filter/query builder.

## Handoff Docs

Read these before continuing development:

- `docs/PROJECT_HANDOFF.md` — product context and current feature status
- `docs/ARCHITECTURE.md` — routes, libs, data model
- `docs/WORKFLOWS.md` — owner workflows by module
- `docs/NEXT_STEPS.md` — remaining gaps and backlog
- `docs/DEPLOYMENT.md` — Vercel + Supabase deployment runbook

Also read `AGENTS.md` because this project uses Next.js 16 and the generated rule warns that APIs may differ from older Next.js versions.

## Main Routes

| Area | Path |
|------|------|
| Dashboard | `/dashboard` |
| Sales | `/sales`, `/sales/[invoice]` |
| Customers | `/customers`, `/customers/[customer]` |
| Inventory | `/inventory`, receive, suppliers, adjust, stock-ins |
| Reports | `/reports` |
| Expenses | `/expenses` |
| Insights | `/insights` |
| Import | `/import` |
| Backup & export | `/backup` |

## Backup

In-app: `/backup` — CSV exports (variants, stock-ins, invoices, invoice-items, payments, expenses, customers) work in every environment. The raw database-file download only works when running locally against a SQLite file; it is disabled against Postgres.

Production backup relies on Supabase's own Point-in-Time Recovery (verify it's enabled in the Supabase dashboard under Database → Backups) plus the in-app CSV exports for portable snapshots.

Desktop script: `tools/backup-database.bat` (Windows, SQLite-only).
