"use server";

import { createDatabaseBackup } from "@/lib/backup";

export type BackupActionState = {
  ok?: boolean;
  error?: string;
  filename?: string;
  createdAt?: string;
};

export async function saveLocalBackup(): Promise<BackupActionState> {
  try {
    const result = await createDatabaseBackup();
    return {
      ok: true,
      filename: result.filename,
      createdAt: result.createdAt.toISOString(),
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create backup. Please try again.",
    };
  }
}
