# Deployment Runbook — Vercel + Supabase

This document covers migrating from local SQLite development to a hosted production environment on **Vercel** (Next.js) with **Supabase** (PostgreSQL).

---

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Vercel project linked to the repo at [vercel.com](https://vercel.com)
- Node.js 20+ and `npm` installed locally
- Prisma CLI: `npx prisma`

---

## 1. Supabase Setup

1. Create a new Supabase project (choose a region close to your users).
2. Under **Settings → Database**, copy the **Connection string** (use the **URI** format, port 5432).
   - It looks like: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`
3. For serverless (Vercel), use the **Session mode pooler** connection string (port 5432, not transaction mode).

---

## 2. Schema Changes for PostgreSQL

The local schema uses SQLite. Before deploying, switch the Prisma datasource to PostgreSQL.

### 2a. Update `prisma/schema.prisma`

Change the datasource block from:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

To:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

> `directUrl` is needed for Prisma Migrate (non-pooled connection). Get it from Supabase under **Settings → Database → Direct connection**.

### 2b. Run the initial migration against Supabase

```bash
# Set the DATABASE_URL and DIRECT_URL to Supabase values temporarily
DATABASE_URL="postgresql://..." DIRECT_URL="postgresql://..." npx prisma migrate deploy
```

This applies all migration files in `prisma/migrations/` in order.

---

## 3. Data Migration (SQLite → Supabase)

If you have existing data you want to carry over:

1. Export all data using the built-in CSV export at `/backup` (export each dataset).
2. Or use the DB download button on `/backup` and convert with a tool like [db-to-pg](https://github.com/prisma/prisma/discussions/1983) or write a seeding script.

**Recommended approach for a clean start:** use the CSV imports at `/import` to re-seed inventory and expenses, then manually re-enter open invoices.

For automated data transfer:

```bash
# Install datasette and pgloader (or use a script)
# Export SQLite to CSV, then import via your seeding mechanism
npx tsx scripts/migrate-data.ts
```

---

## 4. Environment Variables

Add these to your Vercel project under **Settings → Environment Variables**:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase pooler connection string | `postgresql://postgres.[ref]:...@pooler.supabase.com:5432/postgres` |
| `DIRECT_URL` | Supabase direct connection (for migrations) | `postgresql://postgres.[ref]:...@db.[ref].supabase.co:5432/postgres` |
| `AUTH_USERNAME` | Login username | `admin` |
| `AUTH_PASSWORD` | Login password (required to enable auth) | a strong password |
| `AUTH_SECRET` | HMAC secret for session signing | a random 32-char string |

> **Without `AUTH_PASSWORD`, the auth middleware is bypassed.** Always set it in production.

Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Vercel Configuration

### 5a. Build settings

Vercel auto-detects Next.js. No changes to build command needed.

Add a **post-install** hook to generate the Prisma client:

In `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

### 5b. Deploy

```bash
# Push to your linked Git branch (main or a deploy branch)
git push origin main
```

Vercel triggers a build automatically. Monitor the build log.

### 5c. Run migrations on deploy (optional CI step)

Add a pre-deploy script or GitHub Action:

```yaml
# .github/workflows/deploy.yml
- name: Run Prisma migrations
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    DIRECT_URL: ${{ secrets.DIRECT_URL }}
  run: npx prisma migrate deploy
```

---

## 6. Backup Strategy on Hosted Environment

The `/backup` page has two functions:
1. **Download DB** — only works locally (SQLite file download). On Vercel/Supabase this button will be disabled or return an error.
2. **CSV exports** — work on both local and hosted environments (they query the DB and generate CSV).

For Supabase backups:
- Enable Point-in-Time Recovery (PITR) in Supabase dashboard under **Database → Backups**.
- Use **Supabase CLI** for manual snapshots: `supabase db dump`.

Update the `/backup` page for the hosted environment by checking `process.env.DATABASE_URL` for a `postgresql://` prefix and hiding the DB download button.

---

## 7. Post-Deploy Smoke Tests

Run these manually after first deploy:

- [ ] Login page appears at `/login`; credentials from env vars work
- [ ] Dashboard loads with no errors
- [ ] `/sales` — create a new invoice, verify it appears in the list
- [ ] `/inventory` — browse SKUs; verify stock counts correct
- [ ] `/inventory/receive` — receive stock for an existing SKU
- [ ] `/customers` — customer list loads
- [ ] `/reports` — reports load (outstanding, profitability, expenses)
- [ ] `/backup` — CSV exports download correctly (DB download disabled is OK)
- [ ] `/import` — upload a small inventory CSV, verify rows appear in inventory

---

## 8. Rollback Plan

If a deployment breaks:

1. **Instant rollback**: In Vercel dashboard → Deployments → select last good deployment → Promote to Production.
2. **Database rollback**: If a migration caused data issues, use Supabase PITR (Point-in-Time Recovery) to restore to a timestamp before the deploy.

For schema rollbacks, write a revert migration:
```bash
npx prisma migrate dev --name revert_xxx
# Write the inverse SQL in the generated migration file
npx prisma migrate deploy
```

---

## 9. Local Development with Supabase

If you want to use Supabase locally (instead of SQLite):

```bash
# Install Supabase CLI
npm install -g supabase

# Start local Supabase
supabase start

# Update .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

Keep `.env` pointing to SQLite for the default dev path:
```
DATABASE_URL="file:./dev.db"
```

Use `.env.production.local` for Supabase credentials during production testing.

---

## Appendix: .env.example

```
# Local development (SQLite)
DATABASE_URL="file:./dev.db"

# Auth (set to enable login)
AUTH_USERNAME="admin"
AUTH_PASSWORD=""
AUTH_SECRET=""

# Production (Supabase PostgreSQL)
# DATABASE_URL="postgresql://..."
# DIRECT_URL="postgresql://..."
```
