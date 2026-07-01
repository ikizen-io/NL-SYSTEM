import { NextRequest, NextResponse } from "next/server";
import { runGlobalSearch } from "@/lib/global-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const results = await runGlobalSearch(query);
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed." },
      { status: 500 },
    );
  }
}
