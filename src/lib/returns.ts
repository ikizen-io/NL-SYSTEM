export type ReturnRecordInput = {
  refundAmount: number;
  items: { invoiceItemId: string; qty: number }[];
};

export function returnedQtyByItem(returnRecords: ReturnRecordInput[]) {
  const map = new Map<string, number>();
  for (const record of returnRecords) {
    for (const item of record.items) {
      map.set(
        item.invoiceItemId,
        (map.get(item.invoiceItemId) ?? 0) + item.qty,
      );
    }
  }
  return map;
}

export function availableReturnQty(
  invoiceItemId: string,
  soldQty: number,
  returnRecords: ReturnRecordInput[],
) {
  const returned = returnedQtyByItem(returnRecords).get(invoiceItemId) ?? 0;
  return Math.max(0, soldQty - returned);
}

export function hasPartialReturns(returnRecords: ReturnRecordInput[]) {
  return returnRecords.some((record) => record.items.length > 0);
}

export function totalRefunded(returnRecords: ReturnRecordInput[]) {
  return returnRecords.reduce((sum, record) => sum + record.refundAmount, 0);
}

export function allItemsFullyReturned(
  items: { id: string; qty: number }[],
  returnRecords: ReturnRecordInput[],
) {
  if (items.length === 0) return false;
  const returned = returnedQtyByItem(returnRecords);
  return items.every((item) => (returned.get(item.id) ?? 0) >= item.qty);
}
