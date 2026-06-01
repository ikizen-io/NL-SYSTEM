import type { Prisma } from "@prisma/client";
import { invoiceFinancials } from "@/lib/invoices";

export const invoiceDetailInclude = {
  customer: true,
  items: { include: { variant: { include: { product: true } } } },
  payments: { orderBy: { date: "desc" as const } },
  returnRecords: {
    include: {
      items: {
        include: {
          invoiceItem: {
            include: { variant: { include: { product: true } } },
          },
        },
      },
      exchanges: {
        include: {
          variant: { include: { product: true } },
          invoiceItem: true,
        },
      },
    },
    orderBy: { date: "desc" as const },
  },
} satisfies Prisma.InvoiceInclude;

export const invoiceFinancialInclude = {
  items: true,
  payments: true,
  returnRecords: { include: { items: true } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: typeof invoiceDetailInclude;
}>;

export type InvoiceFinancialSource = Prisma.InvoiceGetPayload<{
  include: typeof invoiceFinancialInclude;
}>;

export function toReturnRecordInput(
  returnRecords: InvoiceFinancialSource["returnRecords"],
): { refundAmount: number; items: { invoiceItemId: string; qty: number }[] }[] {
  return returnRecords.map((record) => ({
    refundAmount: record.refundAmount,
    items: record.items.map((item) => ({
      invoiceItemId: item.invoiceItemId,
      qty: item.qty,
    })),
  }));
}

export function invoiceStatsFromRecord(inv: InvoiceFinancialSource) {
  return invoiceFinancials({
    status: inv.status,
    shippingCharge: inv.shippingCharge,
    discountAmount: inv.discountAmount,
    items: inv.items,
    payments: inv.payments,
    returnRecords: toReturnRecordInput(inv.returnRecords),
  });
}
