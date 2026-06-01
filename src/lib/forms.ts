export function safeInt(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

export function clampInt(value: number, min = 0) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.trunc(value));
}
