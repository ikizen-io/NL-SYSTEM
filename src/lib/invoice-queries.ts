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

/** Sales ledger + dashboard recent rows — financial fields without heavy nesting. */
export const salesLedgerInclude = {
  customer: { select: { name: true } },
  items: {
    select: {
      id: true,
      qty: true,
      unitPrice: true,
      unitCostAtSale: true,
      variant: {
        select: {
          sizeLabel: true,
          color: true,
          product: { select: { modelName: true, brand: true } },
        },
      },
    },
  },
  payments: { select: { amount: true } },
  returnRecords: { include: { items: { select: { invoiceItemId: true, qty: true } } } },
} satisfies Prisma.InvoiceInclude;

/** Reports — profitability needs returnItems + product on variants. */
export const reportsInvoiceInclude = {
  customer: { select: { name: true } },
  items: {
    select: {
      id: true,
      qty: true,
      unitPrice: true,
      unitCostAtSale: true,
      returnItems: { select: { qty: true } },
      variant: {
        select: {
          product: { select: { brand: true, modelName: true } },
        },
      },
    },
  },
  payments: { select: { amount: true } },
  returnRecords: { include: { items: { select: { invoiceItemId: true, qty: true } } } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceDetail = Prisma.InvoiceGetPayload<{
  include: typeof invoiceDetailInclude;
}>;

export type InvoiceFinancialSource = {
  status: string;
  shippingCharge: number;
  discountAmount: number;
  items: { id: string; qty: number; unitPrice: number; unitCostAtSale: number }[];
  payments: { amount: number }[];
  returnRecords: {
    refundAmount: number;
    items: { invoiceItemId: string; qty: number }[];
  }[];
};

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

export function invoiceStatsFromRecord(
  inv: InvoiceFinancialSource | Prisma.InvoiceGetPayload<{ include: typeof invoiceFinancialInclude }>,
) {
  return invoiceFinancials({
    status: inv.status,
    shippingCharge: inv.shippingCharge,
    discountAmount: inv.discountAmount,
    items: inv.items,
    payments: inv.payments,
    returnRecords: toReturnRecordInput(inv.returnRecords),
  });
}
