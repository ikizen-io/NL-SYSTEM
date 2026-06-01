"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLkr, formatPct } from "@/lib/format";

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
  lineItems: LineItem[];
  edit: React.ReactNode;
  returns: React.ReactNode;
  payments: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="returns">Returns</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Revenue
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {formatLkr(stats.revenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Gross profit
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {formatLkr(stats.gp)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {formatPct(stats.margin)} margin
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Balance
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {formatLkr(stats.balance)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Paid: {formatLkr(stats.paid)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Refunded
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums">
                {formatLkr(stats.refunded)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="border-b border-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950">
            Line items
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
                  <TH align="right">Net total</TH>
                </tr>
              </THead>
              <TBody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50">
                    <TD className="font-mono text-xs">{item.sku}</TD>
                    <TD>{item.label}</TD>
                    <TD align="right">{item.qty}</TD>
                    <TD align="right">{item.returnedQty || "—"}</TD>
                    <TD align="right">{formatLkr(item.unitPrice)}</TD>
                    <TD align="right">{formatLkr(item.netLineTotal)}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="edit">{edit}</TabsContent>
      <TabsContent value="returns" className="space-y-4">
        {returns}
      </TabsContent>
      <TabsContent value="payments" className="space-y-4">
        {payments}
      </TabsContent>
    </Tabs>
  );
}
