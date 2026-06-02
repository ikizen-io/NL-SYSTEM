import fs from "node:fs/promises";
import path from "node:path";
import { isSqliteDatabase } from "@/lib/runtime";

export { isSqliteDatabase };

const BACKUP_DIR_NAME = "backups";

export function resolveDatabasePath() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (!url.startsWith("file:")) {
    throw new Error("Only SQLite file databases can be backed up.");
  }

  const filePath = url.replace(/^file:/, "");
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(process.cwd(), "prisma", filePath.replace(/^\.\//, ""));
}

export function resolveBackupDir() {
  return path.join(process.cwd(), BACKUP_DIR_NAME);
}

function backupStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export async function createDatabaseBackup() {
  const source = resolveDatabasePath();
  const backupDir = resolveBackupDir();

  try {
    await fs.access(source);
  } catch {
    throw new Error("Database file not found. Check DATABASE_URL and prisma/dev.db.");
  }

  await fs.mkdir(backupDir, { recursive: true });

  const filename = `dev_${backupStamp()}.db`;
  const destination = path.join(backupDir, filename);
  await fs.copyFile(source, destination);

  return { filename, destination, createdAt: new Date() };
}

export async function getLatestBackupInfo() {
  const backupDir = resolveBackupDir();
  try {
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".db"))
      .map((entry) => entry.name);

    if (files.length === 0) return null;

    const withStats = await Promise.all(
      files.map(async (name) => {
        const fullPath = path.join(backupDir, name);
        const stat = await fs.stat(fullPath);
        return { name, fullPath, mtime: stat.mtime, size: stat.size };
      }),
    );

    withStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    return withStats[0] ?? null;
  } catch {
    return null;
  }
}

export async function readDatabaseBytes() {
  const source = resolveDatabasePath();
  return fs.readFile(source);
}
