export const paymentMethodValues = [
  "BANK",
  "CASH",
  "COD",
  "TRANSFER",
  "KOKO",
  "OTHER",
] as const;

export type PaymentMethodValue = (typeof paymentMethodValues)[number];

export const paymentMethodLabels: Record<PaymentMethodValue, string> = {
  BANK: "Bank transfer",
  CASH: "Cash",
  COD: "Cash on delivery",
  TRANSFER: "Transfer",
  KOKO: "KOKO Pay (3 installments)",
  OTHER: "Other",
};

export const paymentMethodOptions = paymentMethodValues.map((value) => ({
  value,
  label: paymentMethodLabels[value],
}));

export function paymentMethodLabel(method: string | null | undefined) {
  if (!method) return "";
  return paymentMethodLabels[method as PaymentMethodValue] ?? method;
}
