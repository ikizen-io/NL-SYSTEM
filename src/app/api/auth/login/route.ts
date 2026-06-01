import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const username = (body.get("username") as string | null) ?? "";
  const password = (body.get("password") as string | null) ?? "";
  const from = (body.get("from") as string | null) ?? "/";

  if (!checkCredentials(username, password)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=1&from=${encodeURIComponent(from)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  await createSession(username);

  const redirectTo = from.startsWith("/") ? from : "/";
  const url = request.nextUrl.clone();
  url.pathname = redirectTo;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
