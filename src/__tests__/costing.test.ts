import { describe, it, expect } from "vitest";
import { effectiveUnitCost } from "@/lib/costing";

describe("effectiveUnitCost", () => {
  it("returns unitCost unchanged when there is no extra cost", () => {
    expect(effectiveUnitCost({ qty: 10, unitCost: 5000, extraCost: null })).toBe(5000);
  });

  it("returns unitCost unchanged when extraCost is 0", () => {
    expect(effectiveUnitCost({ qty: 10, unitCost: 5000, extraCost: 0 })).toBe(5000);
  });

  it("allocates extra cost evenly across qty", () => {
    expect(effectiveUnitCost({ qty: 10, unitCost: 5000, extraCost: 1000 })).toBe(5100);
  });

  it("rounds allocated extra cost to the nearest integer", () => {
    // 1000 / 3 = 333.33... -> rounds to 333
    expect(effectiveUnitCost({ qty: 3, unitCost: 5000, extraCost: 1000 })).toBe(5333);
  });

  it("rounds up at the .5 boundary", () => {
    // 5 / 2 = 2.5 -> rounds to 3
    expect(effectiveUnitCost({ qty: 2, unitCost: 100, extraCost: 5 })).toBe(103);
  });

  it("falls back to unitCost when qty is zero, even with extra cost set", () => {
    expect(effectiveUnitCost({ qty: 0, unitCost: 5000, extraCost: 1000 })).toBe(5000);
  });

  it("falls back to unitCost when qty is negative", () => {
    expect(effectiveUnitCost({ qty: -1, unitCost: 5000, extraCost: 1000 })).toBe(5000);
  });
});
