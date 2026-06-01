import { effectiveUnitCost } from "@/lib/costing";

export type VariantStockSource = {
  stockIns: { qty: number; unitCost: number; extraCost: number | null; receivedDate: Date }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
};

export type InventoryRow = {
  sku: string;
  brand: string;
  category: string;
  modelName: string;
  sizeLabel: string;
  color: string | null;
  active: boolean;
  unitCost: number;
  targetPrice: number | null;
  soldQty: number;
  currentStock: number;
  hasHistory: boolean;
  stockValue: number;
};

export function currentStock(variant: VariantStockSource) {
  let qtyIn = 0;
  for (const stockIn of variant.stockIns) qtyIn += stockIn.qty;

  let qtyAdj = 0;
  for (const adjustment of variant.adjustments) qtyAdj += adjustment.qtyDelta;

  let sold = 0;
  for (const item of variant.invoiceItems) {
    if (item.invoice.status === "ISSUED") sold += item.qty;
  }

  return qtyIn + qtyAdj - sold;
}

export function latestEffectiveUnitCost(
  stockIns: VariantStockSource["stockIns"],
) {
  if (stockIns.length === 0) return 0;
  const latest = [...stockIns].sort(
    (a, b) => b.receivedDate.getTime() - a.receivedDate.getTime(),
  )[0]!;
  return effectiveUnitCost({
    qty: latest.qty,
    unitCost: latest.unitCost,
    extraCost: latest.extraCost,
  });
}

export function computeInventoryRow(variant: {
  sku: string;
  sizeLabel: string;
  color: string | null;
  active: boolean;
  targetPrice: number | null;
  product: { brand: string; category: string; modelName: string };
  stockIns: VariantStockSource["stockIns"];
  adjustments: VariantStockSource["adjustments"];
  invoiceItems: VariantStockSource["invoiceItems"];
}): InventoryRow {
  const unitCost = latestEffectiveUnitCost(variant.stockIns);
  const soldQty = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  const currentStockQty = currentStock(variant);

  return {
    sku: variant.sku,
    brand: variant.product.brand,
    category: variant.product.category,
    modelName: variant.product.modelName,
    sizeLabel: variant.sizeLabel,
    color: variant.color,
    active: variant.active,
    unitCost,
    targetPrice: variant.targetPrice,
    soldQty: Math.max(0, soldQty),
    currentStock: currentStockQty,
    hasHistory:
      variant.stockIns.length > 0 ||
      variant.adjustments.length > 0 ||
      variant.invoiceItems.length > 0,
    stockValue: Math.max(0, currentStockQty) * unitCost,
  };
}

export function computeInventoryRows<
  T extends Parameters<typeof computeInventoryRow>[0],
>(variants: T[]) {
  return variants
    .map((variant) => computeInventoryRow(variant))
    .sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.sku.localeCompare(b.sku),
    );
}
