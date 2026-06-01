import { NextResponse } from "next/server";
import { isSqliteDatabase, readDatabaseBytes, resolveDatabasePath } from "@/lib/backup";

export async function GET() {
  try {
    if (!isSqliteDatabase()) {
      return NextResponse.json(
        {
          error:
            "Raw database downloads are only available for local SQLite. Use CSV exports or Supabase backups for hosted Postgres.",
        },
        { status: 400 },
      );
    }
    resolveDatabasePath();
    const bytes = await readDatabaseBytes();
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `nitro-labs-backup-${stamp}.db`;

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not download database backup.",
      },
      { status: 500 },
    );
  }
}
