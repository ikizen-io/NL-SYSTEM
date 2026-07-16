/**
 * Simple in-memory login throttle for the single-owner gate.
 * Resets on serverless cold start — still raises the cost of casual brute force.
 */

type AttemptBucket = {
  count: number;
  firstAt: number;
  lockedUntil: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, AttemptBucket>();

function prune(now: number) {
  for (const [key, bucket] of attempts) {
    if (bucket.lockedUntil < now && now - bucket.firstAt > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkLoginRateLimit(key: string): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  prune(now);
  const bucket = attempts.get(key);
  if (!bucket) return { ok: true };
  if (bucket.lockedUntil > now) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((bucket.lockedUntil - now) / 1000),
    };
  }
  if (now - bucket.firstAt > WINDOW_MS) {
    attempts.delete(key);
    return { ok: true };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
    return { ok: false, retryAfterSec: Math.ceil(LOCK_MS / 1000) };
  }
  return { ok: true };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const bucket = attempts.get(key);
  if (!bucket || now - bucket.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  bucket.count += 1;
  if (bucket.count >= MAX_ATTEMPTS) {
    bucket.lockedUntil = now + LOCK_MS;
  }
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
