import { NextResponse } from "next/server";
import { readDatabaseBytes, resolveDatabasePath } from "@/lib/backup";

export async function GET() {
  try {
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
