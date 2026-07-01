import { describe, it, expect } from "vitest";
import {
  parseSalesFilters,
  buildSalesInvoiceWhere,
  filterInvoicesByDerivedStatus,
  paginateInvoices,
} from "@/lib/sales-filters";

describe("parseSalesFilters", () => {
  it("defaults to empty/all values when nothing is provided", () => {
    const filters = parseSalesFilters({});
    expect(filters).toEqual({
      q: "",
      from: "",
      to: "",
      status: "all",
      customer: "",
      payMethod: "all",
      brand: "",
      category: "",
      page: 1,
    });
  });

  it("trims free-text fields", () => {
    const filters = parseSalesFilters({ q: "  #1001  ", customer: "  Zumair  " });
    expect(filters.q).toBe("#1001");
    expect(filters.customer).toBe("Zumair");
  });

  it("rejects malformed date strings", () => {
    const filters = parseSalesFilters({ from: "not-a-date", to: "2026/01/01" });
    expect(filters.from).toBe("");
    expect(filters.to).toBe("");
  });

  it("accepts well-formed ISO date strings", () => {
    const filters = parseSalesFilters({ from: "2026-01-01", to: "2026-01-31" });
    expect(filters.from).toBe("2026-01-01");
    expect(filters.to).toBe("2026-01-31");
  });

  it("clamps page to a minimum of 1", () => {
    expect(parseSalesFilters({ page: "0" }).page).toBe(1);
    expect(parseSalesFilters({ page: "-5" }).page).toBe(1);
    expect(parseSalesFilters({ page: "abc" }).page).toBe(1);
    expect(parseSalesFilters({ page: "3" }).page).toBe(3);
  });
});

describe("buildSalesInvoiceWhere", () => {
  it("returns undefined when no filters are active", () => {
    const where = buildSalesInvoiceWhere(parseSalesFilters({}));
    expect(where).toBeUndefined();
  });

  it("builds an OR clause across invoice number and customer name for search", () => {
    const where = buildSalesInvoiceWhere(parseSalesFilters({ q: "#1001" }));
    expect(where).toEqual({
      AND: [
        {
          OR: [
            { invoiceNo: { contains: "#1001" } },
            { customer: { name: { contains: "#1001" } } },
          ],
        },
      ],
    });
  });

  it("combines date range, brand, and category filters", () => {
    const where = buildSalesInvoiceWhere(
      parseSalesFilters({ from: "2026-01-01", to: "2026-01-31", brand: "Adidas", category: "Boots" }),
    );
    expect(where).toEqual({
      AND: [
        { issuedDate: { gte: new Date("2026-01-01T00:00:00.000Z") } },
        { issuedDate: { lte: new Date("2026-01-31T23:59:59.999Z") } },
        { items: { some: { variant: { product: { brand: "Adidas" } } } } },
        { items: { some: { variant: { product: { category: "Boots" } } } } },
      ],
    });
  });

  it("maps paid/pending status filters to ISSUED at the query level", () => {
    const paidWhere = buildSalesInvoiceWhere(parseSalesFilters({ status: "paid" }));
    const pendingWhere = buildSalesInvoiceWhere(parseSalesFilters({ status: "pending" }));
    expect(paidWhere).toEqual({ AND: [{ status: "ISSUED" }] });
    expect(pendingWhere).toEqual({ AND: [{ status: "ISSUED" }] });
  });

  it("passes through CANCELLED/RETURNED status filters directly", () => {
    const where = buildSalesInvoiceWhere(parseSalesFilters({ status: "CANCELLED" }));
    expect(where).toEqual({ AND: [{ status: "CANCELLED" }] });
  });

  it("filters by payment method when payMethod is not 'all'", () => {
    const where = buildSalesInvoiceWhere(parseSalesFilters({ payMethod: "KOKO" }));
    expect(where).toEqual({
      AND: [{ payments: { some: { method: "KOKO" } } }],
    });
  });
});

describe("filterInvoicesByDerivedStatus", () => {
  function makeInvoice(balance: number) {
    return {
      status: "ISSUED",
      shippingCharge: 0,
      discountAmount: 0,
      items: [{ id: "i1", qty: 1, unitPrice: 10000, unitCostAtSale: 5000 }],
      payments: [{ amount: 10000 - balance }],
    };
  }

  it("returns invoices unchanged when status is not paid/pending", () => {
    const invoices = [makeInvoice(0), makeInvoice(500)];
    expect(filterInvoicesByDerivedStatus(invoices, "all")).toHaveLength(2);
  });

  it("filters to only fully paid invoices when status is 'paid'", () => {
    const invoices = [makeInvoice(0), makeInvoice(500)];
    const result = filterInvoicesByDerivedStatus(invoices, "paid");
    expect(result).toHaveLength(1);
  });

  it("filters to only invoices with an outstanding balance when status is 'pending'", () => {
    const invoices = [makeInvoice(0), makeInvoice(500)];
    const result = filterInvoicesByDerivedStatus(invoices, "pending");
    expect(result).toHaveLength(1);
  });
});

describe("paginateInvoices", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("returns the first page by default page size", () => {
    const result = paginateInvoices(items, 1, 10);
    expect(result.items).toEqual(items.slice(0, 10));
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(1);
  });

  it("clamps an out-of-range page to the last valid page", () => {
    const result = paginateInvoices(items, 99, 10);
    expect(result.page).toBe(3);
    expect(result.items).toEqual(items.slice(20, 25));
  });

  it("returns a single (empty) page when there are no items", () => {
    const result = paginateInvoices([], 1, 10);
    expect(result.items).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});
