"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { saveLocalBackup } from "./actions";

export function BackupPanel() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSave() {
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
        <Button asChild variant="outline">
          <a href="/api/backup/database">Download database copy</a>
        </Button>
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save copy to backups folder"}
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Download gives you a `.db` file you can store offline. Save to folder
        also writes under `backups/` in the project (same as the desktop backup
        script).
      </p>
    </div>
  );
}
