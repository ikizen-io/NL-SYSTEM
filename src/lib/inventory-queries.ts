import type { Prisma } from "@prisma/client";

/** Lean include for inventory list, reports, and sale SKU stock checks. */
export const variantStockInclude = {
  product: { select: { brand: true, category: true, modelName: true } },
  stockIns: {
    select: { qty: true, unitCost: true, extraCost: true, receivedDate: true },
    orderBy: { receivedDate: "desc" as const },
  },
  adjustments: { select: { qtyDelta: true } },
  invoiceItems: {
    select: { qty: true, invoice: { select: { status: true } } },
  },
} satisfies Prisma.VariantInclude;

export const variantStockSelect = {
  sku: true,
  sizeLabel: true,
  color: true,
  active: true,
  targetPrice: true,
  imageUrl: true,
  reorderPoint: true,
  product: { select: { brand: true, category: true, modelName: true } },
  stockIns: variantStockInclude.stockIns,
  adjustments: variantStockInclude.adjustments,
  invoiceItems: variantStockInclude.invoiceItems,
} satisfies Prisma.VariantSelect;
