"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLkr, formatPct } from "@/lib/format";
import { cn } from "@/lib/cn";

type LineItem = {
  id: string;
  sku: string;
  label: string;
  qty: number;
  returnedQty: number;
  unitPrice: number;
  lineTotal: number;
  netLineTotal: number;
};

export function InvoiceDetailTabs({
  stats,
  invoiceTotals,
  lineItems,
  edit,
  returns,
  payments,
}: {
  stats: {
    revenue: number;
    gp: number;
    margin: number;
    balance: number;
    paid: number;
    refunded: number;
  };
  invoiceTotals: {
    itemsSubtotal: number;
    shippingCharge: number;
    discountAmount: number;
  };
  lineItems: LineItem[];
  edit: React.ReactNode;
  returns: React.ReactNode;
  payments: React.ReactNode;
}) {
  const hasBalance = stats.balance > 0;
  const hasRefund = stats.refunded > 0;

  return (
    <Tabs defaultValue="overview">
      {/* Tab bar */}
      <TabsList className="w-full justify-start gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="payments" className="relative gap-1.5">
          Payments
          {hasBalance && (
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" title="Outstanding balance" />
          )}
        </TabsTrigger>
        <TabsTrigger value="returns">Returns</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
      </TabsList>

      {/* ── Overview ─────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4">
        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* Revenue */}
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Revenue
              </div>
              <div className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-950">
                {formatLkr(stats.revenue)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">
                GP {formatLkr(stats.gp)} · {formatPct(stats.margin)}
              </div>
            </CardContent>
          </Card>

          {/* Paid */}
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Collected
              </div>
              <div className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-950">
                {formatLkr(stats.paid)}
              </div>
              {hasRefund && (
                <div className="mt-0.5 text-xs text-zinc-400">
                  Refunded {formatLkr(stats.refunded)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Balance — amber when outstanding */}
          <Card
            className={cn(
              hasBalance && "border-amber-200 bg-amber-50/60",
            )}
          >
            <CardContent className="p-3">
              <div
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider",
                  hasBalance ? "text-amber-600" : "text-zinc-400",
                )}
              >
                Balance due
              </div>
              <div
                className={cn(
                  "mt-1.5 text-lg font-semibold tabular-nums",
                  hasBalance ? "text-amber-700" : "text-zinc-400",
                )}
              >
                {formatLkr(stats.balance)}
              </div>
              {hasBalance && (
                <button
                  type="button"
                  className="mt-0.5 text-xs font-medium text-amber-600 hover:underline"
                  onClick={() => {
                    const trigger = document.querySelector<HTMLButtonElement>(
                      '[data-radix-collection-item][value="payments"]',
                    );
                    trigger?.click();
                  }}
                >
                  → Add payment
                </button>
              )}
            </CardContent>
          </Card>

          {/* GP */}
          <Card>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Gross profit
              </div>
              <div
                className={cn(
                  "mt-1.5 text-lg font-semibold tabular-nums",
                  stats.gp < 0 ? "text-red-600" : "text-zinc-950",
                )}
              >
                {formatLkr(stats.gp)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-400">
                {formatPct(stats.margin)} margin
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line items */}
        <Card>
          <div className="border-b border-zinc-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-zinc-950">Line items</span>
            <span className="ml-2 text-xs text-zinc-400">
              {lineItems.length} SKU{lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>SKU</TH>
                  <TH>Product</TH>
                  <TH align="right">Qty</TH>
                  <TH align="right">Returned</TH>
                  <TH align="right">Unit price</TH>
                  <TH align="right">Line total</TH>
                </tr>
              </THead>
              <TBody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <TD className="font-mono text-xs text-zinc-500">{item.sku}</TD>
                    <TD className="text-zinc-800">{item.label}</TD>
                    <TD align="right">{item.qty}</TD>
                    <TD align="right">
                      {item.returnedQty > 0 ? (
                        <span className="text-amber-700">{item.returnedQty}</span>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </TD>
                    <TD align="right">{formatLkr(item.unitPrice)}</TD>
                    <TD align="right" className="font-medium">
                      {formatLkr(item.netLineTotal)}
                    </TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Totals footer */}
          <div className="border-t border-zinc-100 px-4 py-3">
            <div className="ml-auto max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Items subtotal</span>
                <span className="tabular-nums">{formatLkr(invoiceTotals.itemsSubtotal)}</span>
              </div>
              {invoiceTotals.shippingCharge > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span className="tabular-nums">
                    +{formatLkr(invoiceTotals.shippingCharge)}
                  </span>
                </div>
              )}
              {invoiceTotals.discountAmount > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Discount</span>
                  <span className="tabular-nums text-emerald-700">
                    -{formatLkr(invoiceTotals.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 font-semibold text-zinc-950">
                <span>Grand total</span>
                <span className="tabular-nums">{formatLkr(stats.revenue)}</span>
              </div>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* ── Payments ─────────────────────────────── */}
      <TabsContent value="payments" className="space-y-4">
        {payments}
      </TabsContent>

      {/* ── Returns ──────────────────────────────── */}
      <TabsContent value="returns" className="space-y-4">
        {returns}
      </TabsContent>

      {/* ── Edit ─────────────────────────────────── */}
      <TabsContent value="edit">{edit}</TabsContent>
    </Tabs>
  );
}
