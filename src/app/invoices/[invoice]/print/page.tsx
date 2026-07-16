import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatLkr } from "@/lib/format";
import { invoiceFinancialsFromRecord } from "@/lib/invoices";
import { toReturnRecordInput } from "@/lib/invoice-queries";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";
export const preferredRegion = "hnd1";

function invoiceLookup(invoice: string) {
  const decoded = decodeURIComponent(invoice);
  const legacy = decoded.startsWith("#") ? decoded : `#${decoded}`;
  return {
    decoded,
    where: {
      OR: [{ invoiceNo: decoded }, { invoiceNo: legacy }],
    },
  };
}

export default async function PrintableInvoicePage({
  params,
}: {
  params: Promise<{ invoice: string }>;
}) {
  const { invoice } = await params;
  const { decoded, where } = invoiceLookup(invoice);
  const inv = await prisma.invoice.findFirst({
    where,
    include: {
      customer: true,
      items: { include: { variant: { include: { product: true } } } },
      payments: { orderBy: { date: "asc" } },
      returnRecords: { include: { items: true } },
    },
  });

  if (!inv) notFound();

  const returnRecords = toReturnRecordInput(inv.returnRecords);
  const stats = invoiceFinancialsFromRecord({
    status: inv.status,
    shippingCharge: inv.shippingCharge,
    discountAmount: inv.discountAmount,
    items: inv.items,
    payments: inv.payments,
    returnRecords,
  });

  const returnedByItem = new Map<string, number>();
  for (const record of inv.returnRecords) {
    for (const item of record.items) {
      returnedByItem.set(
        item.invoiceItemId,
        (returnedByItem.get(item.invoiceItemId) ?? 0) + item.qty,
      );
    }
  }

  const printLines = inv.items
    .map((item) => {
      const returnedQty = returnedByItem.get(item.id) ?? 0;
      const netQty = Math.max(0, item.qty - returnedQty);
      return { item, netQty, returnedQty };
    })
    .filter((line) => line.netQty > 0 || inv.status === "RETURNED");

  const statusLabel = stats.statusLabel;
  const statusTone = stats.tone;

  const addressLines = (inv.customer?.address ?? "")
    .split(/\r?\n|,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);

  const appendixOnNewPage =
    printLines.length > 4 ||
    inv.payments.length > 2 ||
    (inv.notes?.length ?? 0) > 180 ||
    addressLines.length > 3 ||
    inv.returnRecords.length > 0;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-6 text-zinc-950 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[820px] items-center justify-between print:hidden">
        <Link prefetch={false}
          href={`/sales/${encodeURIComponent(decoded.replace("#", ""))}`}
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
        >
          Back to invoice
        </Link>
        <PrintButton />
      </div>

      <section className="mx-auto max-w-[820px] bg-white p-10 text-zinc-950 shadow-xl print:max-w-none print:p-8 print:shadow-none">
        <header className="print-avoid-break flex items-start justify-between gap-8 border-b border-zinc-200 pb-8 print:pb-6">
          <div>
            <div className="text-5xl font-light tracking-[0.35em] text-zinc-950">
              INVOICE
            </div>
            <div className="mt-5 grid gap-1.5 text-sm text-zinc-700">
              <div>
                <span className="font-semibold text-zinc-950">Invoice No:</span>{" "}
                {inv.invoiceNo}
              </div>
              <div>
                <span className="font-semibold text-zinc-950">Date issued:</span>{" "}
                {inv.issuedDate.toISOString().slice(0, 10)}
              </div>
              {inv.preferredPaymentMethod ? (
                <div>
                  <span className="font-semibold text-zinc-950">
                    Payment option:
                  </span>{" "}
                  {paymentMethodLabel(inv.preferredPaymentMethod)}
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-950">Status:</span>
                <Badge
                  tone={statusTone}
                  className={
                    stats.derivedStatus === "CANCELLED" ? "line-through" : undefined
                  }
                >
                  {statusLabel}
                </Badge>
              </div>
            </div>
          </div>

          <div className="shrink-0 text-right">
            {/* Plain img tag avoids next/image SVG restrictions */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nitro-labs-logo.svg"
              alt="Nitro Labs"
              width={140}
              height={140}
              className="ml-auto h-32 w-32 object-contain"
            />
          </div>
        </header>

        <section className="print-avoid-break grid gap-6 py-8 md:grid-cols-5 print:grid-cols-5 print:py-6">
          <div className="md:col-span-3 print:col-span-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Issued To
            </div>
            <div className="mt-3 text-lg font-semibold text-zinc-950">
              {inv.customer?.name ?? "Walk-in customer"}
            </div>
            <div className="mt-1 grid gap-0.5 text-sm text-zinc-700">
              {inv.customer?.phone ? (
                <div>
                  <span className="text-zinc-500">Phone: </span>
                  {inv.customer.phone}
                </div>
              ) : null}
              {inv.customer?.instagramHandle ? (
                <div>
                  <span className="text-zinc-500">Instagram: </span>
                  {inv.customer.instagramHandle}
                </div>
              ) : null}
            </div>
            {addressLines.length > 0 ? (
              <div className="mt-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Delivery Address
                </div>
                <div className="mt-1 text-sm leading-relaxed text-zinc-700">
                  {addressLines.map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 print:col-span-2">
            {stats.derivedStatus === "COMPLETED" ? (
              <div className="print-exact flex h-full flex-col justify-between rounded-2xl bg-emerald-600 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100">
                  Status
                </div>
                <div className="mt-1 text-2xl font-semibold">Paid in Full</div>
                <div className="mt-3 grid gap-1 text-xs text-emerald-50">
                  <div className="flex justify-between">
                    <span>Grand total</span>
                    <span className="tabular-nums">{formatLkr(stats.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="tabular-nums">{formatLkr(stats.paid)}</span>
                  </div>
                  {stats.refunded > 0 ? (
                    <div className="flex justify-between">
                      <span>Refunded</span>
                      <span className="tabular-nums">{formatLkr(stats.refunded)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : stats.derivedStatus === "CANCELLED" ? (
              <div className="print-exact flex h-full flex-col justify-between rounded-2xl bg-zinc-200 p-5 text-zinc-700">
                <div className="text-xs font-semibold uppercase tracking-[0.24em]">
                  Status
                </div>
                <div className="mt-1 text-2xl font-semibold">Void</div>
                <div className="mt-3 text-xs">
                  This invoice has been cancelled and is not collectible.
                </div>
              </div>
            ) : stats.balance < 0 ? (
              <div className="print-exact flex h-full flex-col justify-between rounded-2xl bg-rose-700 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-100">
                  Refund due
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {formatLkr(Math.abs(stats.balance))}
                </div>
                <div className="mt-3 grid gap-1 text-xs text-rose-50">
                  <div className="flex justify-between">
                    <span>Net total</span>
                    <span className="tabular-nums">{formatLkr(stats.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="tabular-nums">{formatLkr(stats.paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refunded</span>
                    <span className="tabular-nums">{formatLkr(stats.refunded)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="print-exact flex h-full flex-col justify-between rounded-2xl bg-zinc-950 p-5 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Amount Due
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums">
                  {formatLkr(stats.balance)}
                </div>
                <div className="mt-3 grid gap-1 text-xs text-zinc-300">
                  <div className="flex justify-between">
                    <span>Grand total</span>
                    <span className="tabular-nums">{formatLkr(stats.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid</span>
                    <span className="tabular-nums">{formatLkr(stats.paid)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <table className="w-full border-collapse text-sm text-zinc-950">
          <thead>
            <tr className="bg-zinc-100 text-xs uppercase tracking-[0.18em] text-zinc-600">
              <th className="w-12 px-3 py-3 text-left">No</th>
              <th className="px-3 py-3 text-left">Description</th>
              <th className="w-16 px-3 py-3 text-right">Qty</th>
              <th className="w-28 px-3 py-3 text-right">Price</th>
              <th className="w-32 px-3 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {(printLines.length > 0 ? printLines : inv.items.map((item) => ({
              item,
              netQty: item.qty,
              returnedQty: 0,
            }))).map(({ item, netQty, returnedQty }, index) => (
              <tr key={item.id}>
                <td className="px-3 py-4 text-zinc-500">{index + 1}</td>
                <td className="px-3 py-4">
                  <div className="font-semibold text-zinc-950">
                    {item.variant.product.brand} {item.variant.product.modelName}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {item.variant.sizeLabel}
                    {item.variant.color ? ` • ${item.variant.color}` : ""} • SKU{" "}
                    {item.variant.sku}
                    {returnedQty > 0 ? ` • Returned ${returnedQty}` : ""}
                  </div>
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-zinc-950">
                  {netQty}
                </td>
                <td className="px-3 py-4 text-right tabular-nums text-zinc-950">
                  {formatLkr(item.unitPrice)}
                </td>
                <td className="px-3 py-4 text-right font-medium tabular-nums text-zinc-950">
                  {formatLkr(netQty * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="print-avoid-break mt-8 flex justify-end print:mt-6">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-200">
            <TotalRow
              label="Items total"
              value={formatLkr(
                printLines.reduce(
                  (sum, line) => sum + line.netQty * line.item.unitPrice,
                  0,
                ),
              )}
            />
            {inv.shippingCharge > 0 && stats.revenue > 0 ? (
              <TotalRow label="Shipping" value={formatLkr(inv.shippingCharge)} />
            ) : null}
            {inv.discountAmount > 0 && stats.revenue > 0 ? (
              <TotalRow
                label="Discount"
                value={`- ${formatLkr(inv.discountAmount)}`}
                muted
              />
            ) : null}
            <TotalRow label="Grand total" value={formatLkr(stats.revenue)} strong />
            <TotalRow label="Paid" value={formatLkr(stats.paid)} />
            {stats.refunded > 0 ? (
              <TotalRow label="Refunded" value={formatLkr(stats.refunded)} />
            ) : null}
            <TotalRow
              label={
                stats.balance < 0
                  ? "Refund due"
                  : stats.derivedStatus === "COMPLETED"
                    ? "Balance"
                    : "Balance due"
              }
              value={formatLkr(Math.abs(stats.balance))}
              strong
              dark
            />
          </div>
        </section>

        {inv.payments.length > 0 ? (
          <section className="print-avoid-break mt-8 print:mt-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Payments Received
            </div>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                    Date
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                    Method
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                    Reference
                  </th>
                  <th className="border-b border-zinc-200 px-3 py-2 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {inv.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">
                      {payment.date.toISOString().slice(0, 10)}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-700">
                      {paymentMethodLabel(payment.method)}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-zinc-600">
                      {payment.reference || "—"}
                    </td>
                    <td className="border-b border-zinc-100 px-3 py-2 text-right font-medium tabular-nums text-zinc-950">
                      {formatLkr(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}

        {inv.notes ? (
          <section className="print-avoid-break mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 print:mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Notes
            </div>
            <div className="mt-1 whitespace-pre-line text-zinc-800">
              {inv.notes}
            </div>
          </section>
        ) : null}

        <div
          className={cn(
            "print-avoid-break mt-10 print:mt-6",
            appendixOnNewPage && "print-break-before-page",
          )}
        >
          <section className="grid gap-8 border-t border-zinc-200 pt-8 md:grid-cols-2 print:pt-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Payment Information
              </div>
              <div className="mt-3 grid gap-1 text-sm text-zinc-800">
                <div>Bank Name: Commercial Bank</div>
                <div>Bank Branch: Maradana</div>
                <div>Account No: 8017975618</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Contact
              </div>
              <div className="mt-3 grid gap-1 text-sm text-zinc-800">
                <div>WhatsApp: +94 71 520 8881</div>
                <div>Instagram: @nitro.labs</div>
              </div>
            </div>
          </section>

          <footer className="mt-10 text-center text-xs text-zinc-500 print:mt-8">
            Thank you for shopping with Nitro Labs.
          </footer>
        </div>
      </section>
    </main>
  );
}

function TotalRow({
  label,
  value,
  strong,
  dark,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  dark?: boolean;
  muted?: boolean;
}) {
  if (dark) {
    return (
      <div className="print-exact flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
        <span className="font-semibold text-white">{label}</span>
        <span className="font-semibold tabular-nums text-white">{value}</span>
      </div>
    );
  }
  const labelClass = strong
    ? "font-semibold text-zinc-950"
    : muted
      ? "text-zinc-500"
      : "text-zinc-600";
  const valueClass = strong
    ? "font-semibold tabular-nums text-zinc-950"
    : muted
      ? "tabular-nums text-zinc-500"
      : "tabular-nums text-zinc-950";
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 text-zinc-950 last:border-b-0">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
