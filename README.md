# Nitro Labs Owner System

Single-owner web system for Nitro Labs, a sportswear shop, replacing a Google Sheets workflow for sales, CRM/customer history, inventory, suppliers, expenses, dashboard reporting, and insights.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- SQLite

## Local Development

```bash
npm install
npx prisma db push
npm run dev
```

The team has been running the app on port 3005:

```bash
npx next dev --port 3005
```

Open `http://localhost:3005`.

## Database

SQLite connection is configured in `.env`:

```env
DATABASE_URL="file:./dev.db"
```

Schema is in `prisma/schema.prisma`.

After schema changes:

```bash
npx prisma db push
```

On Windows, if Prisma generation fails with `EPERM` on the query engine DLL, stop running Node/Next processes first, then rerun `npx prisma generate` or `npx prisma db push`.

## Handoff Docs

Read these before continuing development:

- `docs/PROJECT_HANDOFF.md` — product context and current feature status
- `docs/ARCHITECTURE.md` — routes, libs, data model
- `docs/WORKFLOWS.md` — owner workflows by module
- `docs/NEXT_STEPS.md` — remaining gaps and backlog

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

In-app: `/backup` (download DB, save to `backups/`, CSV exports).

Desktop script: `tools/backup-database.bat` (Windows).

Restore: stop the app, replace `prisma/dev.db`, restart.
