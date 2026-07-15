import {
  allItemsFullyReturned,
  hasPartialReturns,
  returnedQtyByItem,
  type ReturnRecordInput,
} from "@/lib/returns";

export type InvoiceFinancialInput = {
  status: string;
  shippingCharge: number;
  discountAmount: number;
  items: { id: string; qty: number; unitPrice: number; unitCostAtSale: number }[];
  payments?: { amount: number }[];
  returnRecords?: ReturnRecordInput[];
};

export type InvoiceFinancials = {
  sign: number;
  revenue: number;
  cogs: number;
  gp: number;
  margin: number;
  paid: number;
  refunded: number;
  balance: number;
  derivedStatus: string;
  statusLabel: string;
  tone: "neutral" | "success" | "warning" | "danger";
  hasPartialReturns: boolean;
};

export function invoiceFinancials(inv: InvoiceFinancialInput): InvoiceFinancials {
  const returnRecords = inv.returnRecords ?? [];
  const partialReturns = hasPartialReturns(returnRecords);
  const refunded = returnRecords.reduce((sum, record) => sum + record.refundAmount, 0);

  if (inv.status === "CANCELLED") {
    const paid = (inv.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
    return {
      sign: 0,
      revenue: 0,
      cogs: 0,
      gp: 0,
      margin: 0,
      paid,
      refunded,
      balance: 0,
      derivedStatus: "CANCELLED",
      statusLabel: "Void",
      tone: "neutral",
      hasPartialReturns: partialReturns,
    };
  }

  if (inv.status === "RETURNED") {
    const sign = -1;
    const itemsRevenue = inv.items.reduce(
      (sum, item) => sum + sign * item.qty * item.unitPrice,
      0,
    );
    const revenue =
      itemsRevenue + sign * inv.shippingCharge - sign * inv.discountAmount;
    const cogs = inv.items.reduce(
      (sum, item) => sum + sign * item.qty * item.unitCostAtSale,
      0,
    );
    const gp = revenue - cogs;
    const paid = (inv.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
    return {
      sign,
      revenue,
      cogs,
      gp,
      margin: revenue !== 0 ? gp / revenue : 0,
      paid,
      refunded,
      balance: revenue - paid,
      derivedStatus: "RETURNED",
      statusLabel: "Returned",
      tone: "danger",
      hasPartialReturns: partialReturns,
    };
  }

  const returned = returnedQtyByItem(returnRecords);
  let itemsRevenue = 0;
  let cogs = 0;

  for (const item of inv.items) {
    const returnedQty = returned.get(item.id) ?? 0;
    const netQty = Math.max(0, item.qty - returnedQty);
    itemsRevenue += netQty * item.unitPrice;
    cogs += netQty * item.unitCostAtSale;
  }

  const fullyReturned = allItemsFullyReturned(inv.items, returnRecords);
  const shippingCharge = fullyReturned ? 0 : inv.shippingCharge;
  const discountAmount = fullyReturned ? 0 : inv.discountAmount;
  const revenue = itemsRevenue + shippingCharge - discountAmount;
  const gp = revenue - cogs;
  const margin = revenue !== 0 ? gp / revenue : 0;
  const paid = (inv.payments ?? []).reduce((sum, payment) => sum + payment.amount, 0);
  const balance = revenue - paid + refunded;

  // Full return/cancel of every line is not a successful sale — don't show
  // "Paid (partial return)" in green just because the cash is settled.
  let derivedStatus: string;
  let statusLabel: string;
  let tone: InvoiceFinancials["tone"];

  if (fullyReturned) {
    if (balance < 0) {
      derivedStatus = "PENDING";
      statusLabel = "Returned (refund due)";
      tone = "warning";
    } else {
      derivedStatus = "RETURNED";
      statusLabel = "Returned";
      tone = "danger";
    }
  } else if (balance === 0) {
    derivedStatus = "COMPLETED";
    statusLabel = partialReturns ? "Paid (partial return)" : "Paid";
    tone = "success";
  } else {
    derivedStatus = "PENDING";
    statusLabel = partialReturns ? "Pending (partial return)" : "Pending";
    tone = "warning";
  }

  return {
    sign: 1,
    revenue,
    cogs,
    gp,
    margin,
    paid,
    refunded,
    balance,
    derivedStatus,
    statusLabel,
    tone,
    hasPartialReturns: partialReturns,
  };
}

export function customerSlug(name: string) {
  return encodeURIComponent(name);
}

export function decodeCustomerSlug(slug: string) {
  return decodeURIComponent(slug);
}

export function invoiceFinancialsFromRecord(
  inv: {
    status: string;
    shippingCharge: number;
    discountAmount: number;
    items: { id: string; qty: number; unitPrice: number; unitCostAtSale: number }[];
    payments: { amount: number }[];
    returnRecords: ReturnRecordInput[];
  },
) {
  return invoiceFinancials({
    status: inv.status,
    shippingCharge: inv.shippingCharge,
    discountAmount: inv.discountAmount,
    items: inv.items,
    payments: inv.payments,
    returnRecords: inv.returnRecords,
  });
}
