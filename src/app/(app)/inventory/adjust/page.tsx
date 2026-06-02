import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { StockAdjustForm } from "./StockAdjustForm";

export const dynamic = "force-dynamic";

function currentStock(variant: {
  stockIns: { qty: number }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
}) {
  const received = variant.stockIns.reduce((sum, stock) => sum + stock.qty, 0);
  const adjusted = variant.adjustments.reduce((sum, adj) => sum + adj.qtyDelta, 0);
  const sold = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  return received + adjusted - sold;
}

export default async function AdjustStockPage() {
  const variants = await prisma.variant.findMany({
    where: { active: true },
    include: {
      product: true,
      stockIns: { select: { qty: true } },
      adjustments: { select: { qtyDelta: true } },
      invoiceItems: { include: { invoice: { select: { status: true } } } },
    },
    orderBy: { sku: "asc" },
  });
  const adjustments = await prisma.stockAdjustment.findMany({
    include: { variant: { include: { product: true } } },
    orderBy: { date: "desc" },
    take: 20,
  });

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Adjust stock</PageTitle>
          <PageDescription>
            Set counted stock after a manual count, damage, loss, or correction.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory">Back</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Set counted stock</CardTitle>
        </CardHeader>
        <CardContent>
          <StockAdjustForm
            variants={variants.map((variant) => ({
              sku: variant.sku,
              label: `${variant.sku} — ${variant.product.brand} / ${variant.product.modelName} / ${variant.sizeLabel}${variant.color ? ` / ${variant.color}` : ""}`,
              stock: currentStock(variant),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent adjustments</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>SKU</TH>
                <TH>Item</TH>
                <TH align="right">Delta</TH>
                <TH>Reason</TH>
                <TH>Notes</TH>
              </tr>
            </THead>
            <TBody>
              {adjustments.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={6}>
                    No stock adjustments yet.
                  </TD>
                </tr>
              ) : (
                adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-zinc-50">
                    <TD>{adjustment.date.toISOString().slice(0, 10)}</TD>
                    <TD className="font-medium">{adjustment.variant.sku}</TD>
                    <TD>
                      {adjustment.variant.product.modelName} /{" "}
                      {adjustment.variant.sizeLabel}
                      {adjustment.variant.color
                        ? ` / ${adjustment.variant.color}`
                        : ""}
                    </TD>
                    <TD align="right">{adjustment.qtyDelta}</TD>
                    <TD>{adjustment.reason}</TD>
                    <TD className="text-zinc-600">{adjustment.notes}</TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </Page>
  );
}

