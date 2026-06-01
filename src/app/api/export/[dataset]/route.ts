import { NextResponse } from "next/server";
import { buildExportCsv, isExportDataset } from "@/lib/export-data";

export async function GET(
  _request: Request,
  context: { params: Promise<{ dataset: string }> },
) {
  const { dataset } = await context.params;

  if (!isExportDataset(dataset)) {
    return NextResponse.json({ error: "Unknown export dataset." }, { status: 404 });
  }

  try {
    const { filename, content } = await buildExportCsv(dataset);
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not export CSV.",
      },
      { status: 500 },
    );
  }
}
