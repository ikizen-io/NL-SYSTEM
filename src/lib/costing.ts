export function effectiveUnitCost(stockIn: {
  qty: number;
  unitCost: number;
  extraCost: number | null;
}) {
  const extra = stockIn.extraCost ?? 0;
  if (stockIn.qty <= 0) return stockIn.unitCost;
  const allocated = Math.round(extra / stockIn.qty);
  return stockIn.unitCost + allocated;
}

