import { describe, it, expect } from "vitest";
import {
  currentStock,
  latestEffectiveUnitCost,
  computeInventoryRow,
  computeInventoryRows,
} from "@/lib/inventory";

function stockIn(
  qty: number,
  unitCost: number,
  extraCost: number | null = null,
  receivedDate = new Date("2026-01-01"),
) {
  return { qty, unitCost, extraCost, receivedDate };
}

function adjustment(qtyDelta: number) {
  return { qtyDelta };
}

function invoiceItem(qty: number, status: string) {
  return { qty, invoice: { status } };
}

describe("currentStock", () => {
  it("returns 0 for a variant with no history", () => {
    expect(currentStock({ stockIns: [], adjustments: [], invoiceItems: [] })).toBe(0);
  });

  it("sums stock-in quantities", () => {
    const variant = {
      stockIns: [stockIn(5, 1000), stockIn(3, 1000)],
      adjustments: [],
      invoiceItems: [],
    };
    expect(currentStock(variant)).toBe(8);
  });

  it("applies positive and negative stock adjustments", () => {
    const variant = {
      stockIns: [stockIn(10, 1000)],
      adjustments: [adjustment(2), adjustment(-3)],
      invoiceItems: [],
    };
    expect(currentStock(variant)).toBe(9);
  });

  it("deducts only ISSUED invoice items from stock", () => {
    const variant = {
      stockIns: [stockIn(10, 1000)],
      adjustments: [],
      invoiceItems: [
        invoiceItem(2, "ISSUED"),
        invoiceItem(3, "CANCELLED"),
        invoiceItem(4, "RETURNED"),
      ],
    };
    // only the 2 ISSUED units are deducted; cancelled/returned invoices don't
    // reduce stock here (returns restock via a separate StockAdjustment)
    expect(currentStock(variant)).toBe(8);
  });

  it("can go negative when oversold (data entry outside normal guardrails)", () => {
    const variant = {
      stockIns: [stockIn(2, 1000)],
      adjustments: [],
      invoiceItems: [invoiceItem(5, "ISSUED")],
    };
    expect(currentStock(variant)).toBe(-3);
  });
});

describe("latestEffectiveUnitCost", () => {
  it("returns 0 when there are no stock-ins", () => {
    expect(latestEffectiveUnitCost([])).toBe(0);
  });

  it("uses the most recently received stock-in, not the first in the array", () => {
    const stockIns = [
      stockIn(10, 1000, null, new Date("2026-01-01")),
      stockIn(10, 1500, null, new Date("2026-03-01")),
      stockIn(10, 1200, null, new Date("2026-02-01")),
    ];
    expect(latestEffectiveUnitCost(stockIns)).toBe(1500);
  });

  it("includes extra cost allocation from the latest stock-in", () => {
    const stockIns = [
      stockIn(10, 1000, null, new Date("2026-01-01")),
      stockIn(5, 1000, 500, new Date("2026-02-01")),
    ];
    expect(latestEffectiveUnitCost(stockIns)).toBe(1100);
  });
});

describe("computeInventoryRow", () => {
  function makeVariant(overrides: Partial<Parameters<typeof computeInventoryRow>[0]> = {}) {
    return {
      sku: "SKU-1",
      sizeLabel: "UK 9",
      color: "Black",
      active: true,
      targetPrice: 20000,
      product: { brand: "Adidas", category: "Football Boots", modelName: "Predator" },
      stockIns: [stockIn(10, 5000)],
      adjustments: [],
      invoiceItems: [],
      ...overrides,
    };
  }

  it("computes stock, sold qty, and valuation for a fresh SKU", () => {
    const row = computeInventoryRow(makeVariant());
    expect(row.currentStock).toBe(10);
    expect(row.soldQty).toBe(0);
    expect(row.unitCost).toBe(5000);
    expect(row.stockValue).toBe(50000);
    expect(row.hasHistory).toBe(true);
  });

  it("marks hasHistory false when there are no stock-ins, adjustments, or sales", () => {
    const row = computeInventoryRow(makeVariant({ stockIns: [] }));
    expect(row.hasHistory).toBe(false);
  });

  it("never reports negative stock value even if oversold", () => {
    const row = computeInventoryRow(
      makeVariant({
        stockIns: [stockIn(2, 5000)],
        invoiceItems: [invoiceItem(5, "ISSUED")],
      }),
    );
    expect(row.currentStock).toBe(-3);
    expect(row.stockValue).toBe(0);
  });

  it("only counts ISSUED sales toward soldQty", () => {
    const row = computeInventoryRow(
      makeVariant({
        invoiceItems: [invoiceItem(2, "ISSUED"), invoiceItem(1, "CANCELLED")],
      }),
    );
    expect(row.soldQty).toBe(2);
  });
});

describe("computeInventoryRows", () => {
  it("sorts rows by brand then SKU", () => {
    const rows = computeInventoryRows([
      {
        sku: "Z-1",
        sizeLabel: "UK 9",
        color: null,
        active: true,
        targetPrice: null,
        product: { brand: "Zeta", category: "Shoes", modelName: "Zeta One" },
        stockIns: [],
        adjustments: [],
        invoiceItems: [],
      },
      {
        sku: "A-2",
        sizeLabel: "UK 9",
        color: null,
        active: true,
        targetPrice: null,
        product: { brand: "Alpha", category: "Shoes", modelName: "Alpha One" },
        stockIns: [],
        adjustments: [],
        invoiceItems: [],
      },
      {
        sku: "A-1",
        sizeLabel: "UK 8",
        color: null,
        active: true,
        targetPrice: null,
        product: { brand: "Alpha", category: "Shoes", modelName: "Alpha One" },
        stockIns: [],
        adjustments: [],
        invoiceItems: [],
      },
    ]);

    expect(rows.map((r) => r.sku)).toEqual(["A-1", "A-2", "Z-1"]);
  });
});
