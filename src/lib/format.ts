export function formatLkr(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function invoiceYearKey(date: Date) {
  return String(date.getFullYear()).slice(-2);
}

export function formatInvoiceNo(date: Date, orderNumber: number) {
  return `${invoiceYearKey(date)}${String(orderNumber).padStart(3, "0")}`;
}

