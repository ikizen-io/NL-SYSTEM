import { describe, it, expect } from "vitest";
import { invoiceFinancials } from "@/lib/invoices";

// Helper builders
function makeItem(id: string, qty: number, unitPrice: number, unitCostAtSale: number) {
  return { id, qty, unitPrice, unitCostAtSale };
}

function makePayment(amount: number) {
  return { amount };
}

function makeReturnRecord(
  refundAmount: number,
  items: { invoiceItemId: string; qty: number }[],
) {
  return { refundAmount, items };
}

describe("invoiceFinancials", () => {
  it("calculates revenue, COGS, GP for a simple issued invoice", () => {
    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 500,
      discountAmount: 0,
      items: [makeItem("i1", 2, 10000, 7000)],
    });

    expect(result.revenue).toBe(20500); // 2 * 10000 + 500
    expect(result.cogs).toBe(14000); // 2 * 7000
    expect(result.gp).toBe(6500); // 20500 - 14000
    expect(result.paid).toBe(0);
    expect(result.balance).toBe(20500);
    expect(result.derivedStatus).toBe("PENDING");
  });

  it("marks invoice as COMPLETED when fully paid", () => {
    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 0,
      items: [makeItem("i1", 1, 15000, 10000)],
      payments: [makePayment(15000)],
    });

    expect(result.balance).toBe(0);
    expect(result.derivedStatus).toBe("COMPLETED");
    expect(result.tone).toBe("success");
  });

  it("applies discount correctly", () => {
    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 2000,
      items: [makeItem("i1", 1, 20000, 12000)],
    });

    expect(result.revenue).toBe(18000); // 20000 - 2000
    expect(result.gp).toBe(6000); // 18000 - 12000
  });

  it("returns zero revenue for CANCELLED status", () => {
    const result = invoiceFinancials({
      status: "CANCELLED",
      shippingCharge: 500,
      discountAmount: 100,
      items: [makeItem("i1", 2, 10000, 7000)],
      payments: [makePayment(5000)],
    });

    expect(result.revenue).toBe(0);
    expect(result.cogs).toBe(0);
    expect(result.gp).toBe(0);
    expect(result.paid).toBe(5000);
    expect(result.balance).toBe(0);
    expect(result.derivedStatus).toBe("CANCELLED");
  });

  it("returns negative revenue for RETURNED status", () => {
    const result = invoiceFinancials({
      status: "RETURNED",
      shippingCharge: 500,
      discountAmount: 0,
      items: [makeItem("i1", 1, 15000, 10000)],
    });

    expect(result.revenue).toBe(-15500); // -1 * (15000 + 500)
    expect(result.sign).toBe(-1);
    expect(result.derivedStatus).toBe("RETURNED");
    expect(result.tone).toBe("danger");
  });

  it("reduces revenue and COGS for partial returns", () => {
    const item = makeItem("i1", 3, 10000, 7000);
    // Return 1 of 3 items
    const returnRecord = makeReturnRecord(10000, [{ invoiceItemId: "i1", qty: 1 }]);

    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 0,
      items: [item],
      returnRecords: [returnRecord],
    });

    // net qty = 3 - 1 = 2
    expect(result.revenue).toBe(20000); // 2 * 10000
    expect(result.cogs).toBe(14000); // 2 * 7000
    expect(result.gp).toBe(6000);
    expect(result.hasPartialReturns).toBe(true);
    expect(result.refunded).toBe(10000);
  });

  it("zeroes shipping and discount when all items are fully returned", () => {
    const item = makeItem("i1", 2, 10000, 7000);
    const returnRecord = makeReturnRecord(20000, [{ invoiceItemId: "i1", qty: 2 }]);

    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 500,
      discountAmount: 200,
      items: [item],
      returnRecords: [returnRecord],
    });

    expect(result.revenue).toBe(0); // all returned, no shipping or discount
    expect(result.cogs).toBe(0);
  });

  it("handles multiple items and multiple return records", () => {
    const items = [
      makeItem("a", 2, 10000, 6000),
      makeItem("b", 1, 5000, 3000),
    ];
    const returns = [
      makeReturnRecord(5000, [{ invoiceItemId: "a", qty: 1 }]),
      makeReturnRecord(5000, [{ invoiceItemId: "b", qty: 1 }]),
    ];

    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 0,
      items,
      returnRecords: returns,
    });

    // a net qty = 1, revenue = 10000, cogs = 6000
    // b net qty = 0, excluded
    expect(result.revenue).toBe(10000);
    expect(result.cogs).toBe(6000);
    expect(result.gp).toBe(4000);
    expect(result.refunded).toBe(10000);
  });

  it("returns correct margin", () => {
    const result = invoiceFinancials({
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 0,
      items: [makeItem("i1", 1, 10000, 4000)],
    });

    expect(result.margin).toBeCloseTo(0.6); // 60% margin
  });
});
