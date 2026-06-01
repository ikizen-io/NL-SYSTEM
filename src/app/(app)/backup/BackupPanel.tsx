"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { saveLocalBackup } from "./actions";

export function BackupPanel({ sqliteAvailable }: { sqliteAvailable: boolean }) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSave() {
    if (!sqliteAvailable) {
      setError("Local .db backups are only available when DATABASE_URL uses SQLite.");
      return;
    }
    setPending(true);
    setError(undefined);
    const result = await saveLocalBackup();
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.ok && result.filename) {
      toast.success(`Backup saved as ${result.filename}`);
    }
  }

  return (
    <div className="space-y-3">
      <ActionStateBanner error={error} />
      <div className="flex flex-wrap gap-2">
        {sqliteAvailable ? (
          <Button asChild variant="outline">
            <a href="/api/backup/database">Download database copy</a>
          </Button>
        ) : null}
        <Button type="button" onClick={handleSave} disabled={pending || !sqliteAvailable}>
          {pending ? "Saving..." : "Save copy to backups folder"}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        {sqliteAvailable
          ? "Download gives you a `.db` file you can store offline. Save to folder also writes under `backups/` in the project."
          : "Hosted Postgres backups are managed in Supabase. CSV exports below remain available for spreadsheet snapshots."}
      </p>
    </div>
  );
}
