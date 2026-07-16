import { NextRequest, NextResponse } from "next/server";
import { checkCredentials, createSession } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIp,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

export async function POST(request: NextRequest) {
  const body = await request.formData();
  const username = (body.get("username") as string | null) ?? "";
  const password = (body.get("password") as string | null) ?? "";
  const from = (body.get("from") as string | null) ?? "/";

  const rateKey = `${getClientIp(request)}:${username.trim().toLowerCase() || "*"}`;
  const limit = checkLoginRateLimit(rateKey);
  if (!limit.ok) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=rate&from=${encodeURIComponent(from)}`;
    const response = NextResponse.redirect(url, { status: 303 });
    if (limit.retryAfterSec) {
      response.headers.set("Retry-After", String(limit.retryAfterSec));
    }
    return response;
  }

  if (!checkCredentials(username, password)) {
    recordLoginFailure(rateKey);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=1&from=${encodeURIComponent(from)}`;
    return NextResponse.redirect(url, { status: 303 });
  }

  clearLoginFailures(rateKey);
  await createSession(username);

  const redirectTo = from.startsWith("/") ? from : "/";
  const url = request.nextUrl.clone();
  url.pathname = redirectTo;
  url.search = "";
  return NextResponse.redirect(url, { status: 303 });
}
