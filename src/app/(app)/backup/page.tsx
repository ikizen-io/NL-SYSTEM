import Link from "next/link";
import { getLatestBackupInfo, isSqliteDatabase } from "@/lib/backup";
import { getDatabaseMode } from "@/lib/runtime";
import { exportDatasets } from "@/lib/export-data";
import { formatLkr } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { BackupPanel } from "./BackupPanel";

export const dynamic = "force-dynamic";

const exportLabels: Record<(typeof exportDatasets)[number], string> = {
  variants: "Variants / SKUs (with stock & cost)",
  "stock-ins": "Stock-in batches",
  invoices: "Invoices (totals & balance)",
  "invoice-items": "Invoice line items",
  payments: "Payments",
  expenses: "Expenses",
  customers: "Customers",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function daysSince(date: Date) {
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export default async function BackupPage() {
  const databaseMode = getDatabaseMode();
  const sqliteAvailable = isSqliteDatabase();
  const latestBackup = sqliteAvailable ? await getLatestBackupInfo() : null;
  const backupAgeDays = latestBackup ? daysSince(latestBackup.mtime) : null;

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <PageTitle>Backup & export</PageTitle>
          <PageDescription>
            {databaseMode.backupHint}
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/import">Import</Link>
          </Button>
        </PageActions>
      </PageHeader>

      {!sqliteAvailable ? (
        <Alert tone="info">
          <strong>Production (Supabase):</strong> database backups and point-in-time
          recovery are managed in the Supabase dashboard. Use CSV exports below for
          spreadsheet snapshots from this app.
        </Alert>
      ) : !latestBackup ? (
        <Alert tone="warning">
          No local backup found yet in the `backups/` folder. Download or save a
          database copy before major changes.
        </Alert>
      ) : backupAgeDays !== null && backupAgeDays > 7 ? (
        <Alert tone="warning">
          Last local backup was {latestBackup.name} on{" "}
          {latestBackup.mtime.toISOString().slice(0, 10)} ({backupAgeDays} days
          ago). Consider backing up again.
        </Alert>
      ) : (
        <Alert tone="success">
          Latest local backup: {latestBackup.name} •{" "}
          {latestBackup.mtime.toISOString().replace("T", " ").slice(0, 16)} •{" "}
          {formatBytes(latestBackup.size)}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Database backup</CardTitle>
        </CardHeader>
        <CardContent>
          <BackupPanel sqliteAvailable={sqliteAvailable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>CSV exports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600">
            Exports are read-only snapshots of current data. Amounts are integer
            LKR values, same as in the app ({formatLkr(1000)} format in UI).
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {exportDatasets.map((dataset) => (
              <Button key={dataset} asChild variant="outline" className="justify-start">
                <a href={`/api/export/${dataset}`}>{exportLabels[dataset]}</a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-500">
        CSV exports are for analysis and spreadsheet backups. For hosted
        Postgres point-in-time recovery, use Supabase database backups.
      </p>
    </Page>
  );
}
