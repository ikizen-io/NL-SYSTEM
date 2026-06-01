import { describe, it, expect } from "vitest";
import {
  returnedQtyByItem,
  availableReturnQty,
  hasPartialReturns,
  totalRefunded,
  allItemsFullyReturned,
} from "@/lib/returns";

const rec = (refundAmount: number, items: { invoiceItemId: string; qty: number }[]) => ({
  refundAmount,
  items,
});

describe("returnedQtyByItem", () => {
  it("returns empty map when no records", () => {
    const map = returnedQtyByItem([]);
    expect(map.size).toBe(0);
  });

  it("aggregates qty from multiple records for the same item", () => {
    const records = [
      rec(0, [{ invoiceItemId: "a", qty: 1 }]),
      rec(0, [{ invoiceItemId: "a", qty: 2 }]),
    ];
    const map = returnedQtyByItem(records);
    expect(map.get("a")).toBe(3);
  });

  it("tracks different items separately", () => {
    const records = [
      rec(0, [
        { invoiceItemId: "a", qty: 1 },
        { invoiceItemId: "b", qty: 2 },
      ]),
    ];
    const map = returnedQtyByItem(records);
    expect(map.get("a")).toBe(1);
    expect(map.get("b")).toBe(2);
  });
});

describe("availableReturnQty", () => {
  it("returns soldQty when nothing returned yet", () => {
    expect(availableReturnQty("a", 5, [])).toBe(5);
  });

  it("subtracts already returned qty", () => {
    expect(availableReturnQty("a", 5, [rec(0, [{ invoiceItemId: "a", qty: 2 }])])).toBe(3);
  });

  it("never goes below 0", () => {
    expect(availableReturnQty("a", 2, [rec(0, [{ invoiceItemId: "a", qty: 5 }])])).toBe(0);
  });
});

describe("hasPartialReturns", () => {
  it("returns false when no records", () => {
    expect(hasPartialReturns([])).toBe(false);
  });

  it("returns true when any record has items", () => {
    expect(hasPartialReturns([rec(0, [{ invoiceItemId: "a", qty: 1 }])])).toBe(true);
  });

  it("returns false for records with no items", () => {
    expect(hasPartialReturns([rec(500, [])])).toBe(false);
  });
});

describe("totalRefunded", () => {
  it("sums refundAmount across records", () => {
    const records = [rec(1000, []), rec(500, []), rec(250, [])];
    expect(totalRefunded(records)).toBe(1750);
  });

  it("returns 0 for empty records", () => {
    expect(totalRefunded([])).toBe(0);
  });
});

describe("allItemsFullyReturned", () => {
  it("returns false when no items", () => {
    expect(allItemsFullyReturned([], [])).toBe(false);
  });

  it("returns false when nothing returned", () => {
    const items = [{ id: "a", qty: 2 }];
    expect(allItemsFullyReturned(items, [])).toBe(false);
  });

  it("returns true when all items fully returned", () => {
    const items = [
      { id: "a", qty: 2 },
      { id: "b", qty: 1 },
    ];
    const records = [
      rec(0, [
        { invoiceItemId: "a", qty: 2 },
        { invoiceItemId: "b", qty: 1 },
      ]),
    ];
    expect(allItemsFullyReturned(items, records)).toBe(true);
  });

  it("returns false when only some items returned", () => {
    const items = [
      { id: "a", qty: 2 },
      { id: "b", qty: 1 },
    ];
    const records = [rec(0, [{ invoiceItemId: "a", qty: 2 }])];
    expect(allItemsFullyReturned(items, records)).toBe(false);
  });

  it("returns false when items partially returned", () => {
    const items = [{ id: "a", qty: 3 }];
    const records = [rec(0, [{ invoiceItemId: "a", qty: 2 }])];
    expect(allItemsFullyReturned(items, records)).toBe(false);
  });
});
