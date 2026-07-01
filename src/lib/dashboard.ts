/** The immediately preceding window of the same length as [start, end]. */
export function priorPeriodBounds(start: Date, end: Date) {
  const periodMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start.getTime() - 1);
  const priorStart = new Date(priorEnd.getTime() - periodMs);
  return { start: priorStart, end: priorEnd };
}

export type PeriodDelta = {
  /** Fractional change, e.g. 0.12 for +12%. Null when there's nothing meaningful to compare. */
  pct: number | null;
  direction: "up" | "down" | "flat";
};

/** Percentage change of `current` vs `prior`, guarding the zero-baseline case. */
export function percentDelta(current: number, prior: number): PeriodDelta {
  if (prior === 0) {
    if (current === 0) return { pct: null, direction: "flat" };
    return { pct: null, direction: current > 0 ? "up" : "down" };
  }
  const pct = (current - prior) / Math.abs(prior);
  const direction = pct > 0.0005 ? "up" : pct < -0.0005 ? "down" : "flat";
  return { pct, direction };
}
