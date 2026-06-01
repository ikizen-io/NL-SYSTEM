import Link from "next/link";
import { getLatestBackupInfo } from "@/lib/backup";
import { exportDatasets } from "@/lib/export-data";
import { formatLkr } from "@/lib/format";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { BackupPanel } from "./BackupPanel";

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
  const latestBackup = await getLatestBackupInfo();
  const backupAgeDays = latestBackup ? daysSince(latestBackup.mtime) : null;

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <PageTitle>Backup & export</PageTitle>
          <PageDescription>
            Protect your SQLite data and export CSV snapshots for spreadsheets or
            external tools.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/import">Import</Link>
          </Button>
        </PageActions>
      </PageHeader>

      {!latestBackup ? (
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
          <BackupPanel />
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
        Restoring from a `.db` backup replaces `prisma/dev.db` while the app is
        stopped. CSV exports are for analysis — use Import for structured
        inventory/expense loads.
      </p>
    </Page>
  );
}
