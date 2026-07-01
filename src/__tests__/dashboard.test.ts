import { describe, it, expect } from "vitest";
import { priorPeriodBounds, percentDelta } from "@/lib/dashboard";

describe("priorPeriodBounds", () => {
  it("returns a window of the same length immediately before the given range", () => {
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-03-01T00:00:00.000Z"); // 28 days (2026 is not a leap year)
    const prior = priorPeriodBounds(start, end);

    const currentMs = end.getTime() - start.getTime();
    const priorMs = prior.end.getTime() - prior.start.getTime();
    expect(priorMs).toBe(currentMs);
    expect(prior.end.getTime()).toBe(start.getTime() - 1);
  });

  it("does not overlap the current period", () => {
    const start = new Date("2026-06-01T00:00:00.000Z");
    const end = new Date("2026-06-30T23:59:59.999Z");
    const prior = priorPeriodBounds(start, end);
    expect(prior.end.getTime()).toBeLessThan(start.getTime());
  });
});

describe("percentDelta", () => {
  it("computes a positive percentage change", () => {
    const result = percentDelta(150, 100);
    expect(result.pct).toBeCloseTo(0.5);
    expect(result.direction).toBe("up");
  });

  it("computes a negative percentage change", () => {
    const result = percentDelta(50, 100);
    expect(result.pct).toBeCloseTo(-0.5);
    expect(result.direction).toBe("down");
  });

  it("treats near-zero change as flat", () => {
    const result = percentDelta(100.02, 100);
    expect(result.direction).toBe("flat");
  });

  it("handles a zero prior value with positive current as an unmeasurable increase", () => {
    const result = percentDelta(500, 0);
    expect(result.pct).toBeNull();
    expect(result.direction).toBe("up");
  });

  it("handles a zero prior value with negative current as an unmeasurable decrease", () => {
    const result = percentDelta(-500, 0);
    expect(result.pct).toBeNull();
    expect(result.direction).toBe("down");
  });

  it("treats zero vs zero as flat with no percentage", () => {
    const result = percentDelta(0, 0);
    expect(result.pct).toBeNull();
    expect(result.direction).toBe("flat");
  });

  it("uses the absolute prior value as the baseline when prior is negative", () => {
    // going from -100 to -50 is an improvement of 50% of the |baseline|
    const result = percentDelta(-50, -100);
    expect(result.pct).toBeCloseTo(0.5);
    expect(result.direction).toBe("up");
  });
});
