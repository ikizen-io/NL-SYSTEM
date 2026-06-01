import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { formatLkr } from "@/lib/format";
import { effectiveUnitCost } from "@/lib/costing";
import { ReceivePurchaseForm } from "./ReceivePurchaseForm";

export const dynamic = "force-dynamic";

function currentStock(variant: {
  stockIns: { qty: number }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
}) {
  const received = variant.stockIns.reduce((sum, s) => sum + s.qty, 0);
  const adjusted = variant.adjustments.reduce((sum, a) => sum + a.qtyDelta, 0);
  const sold = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  return received + adjusted - sold;
}

export default async function ReceivePurchasePage() {
  const [variants, suppliers, products, recent] = await Promise.all([
    prisma.variant.findMany({
      where: { active: true },
      include: {
        product: true,
        stockIns: { select: { qty: true } },
        adjustments: { select: { qtyDelta: true } },
        invoiceItems: { include: { invoice: { select: { status: true } } } },
      },
      orderBy: [{ product: { brand: "asc" } }, { sku: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      select: { brand: true, category: true },
    }),
    prisma.stockIn.findMany({
      include: { variant: { include: { product: true } } },
      orderBy: { receivedDate: "desc" },
      take: 12,
    }),
  ]);

  const skus = variants.map((variant) => ({
    sku: variant.sku,
    label: `${variant.sku} — ${variant.product.brand} / ${variant.product.modelName} / ${variant.sizeLabel}${variant.color ? ` / ${variant.color}` : ""}`,
    targetPrice: variant.targetPrice,
    stock: currentStock(variant),
  }));

  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter(Boolean)),
  ).sort();
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean)),
  ).sort();

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Receive purchase</PageTitle>
          <PageDescription>
            Record a supplier purchase. Add multiple items in one batch and
            create new SKUs inline as they arrive.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">Back</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Purchase / GRN</CardTitle>
        </CardHeader>
        <CardContent>
          <ReceivePurchaseForm
            skus={skus}
            suppliers={suppliers}
            brands={brands}
            categories={categories}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent stock-ins</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>SKU</TH>
                <TH>Product</TH>
                <TH>Supplier</TH>
                <TH>Reference</TH>
                <TH align="right">Qty</TH>
                <TH align="right">Unit cost</TH>
                <TH align="right">Effective cost</TH>
              </tr>
            </THead>
            <TBody>
              {recent.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={8}>
                    No stock-ins recorded yet.
                  </TD>
                </tr>
              ) : (
                recent.map((row) => {
                  const effective = effectiveUnitCost({
                    qty: row.qty,
                    unitCost: row.unitCost,
                    extraCost: row.extraCost ?? null,
                  });
                  return (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <TD>{row.receivedDate.toISOString().slice(0, 10)}</TD>
                      <TD className="font-medium">{row.variant.sku}</TD>
                      <TD className="max-w-[260px] truncate">
                        {row.variant.product.brand} /{" "}
                        {row.variant.product.modelName} / {row.variant.sizeLabel}
                        {row.variant.color ? ` / ${row.variant.color}` : ""}
                      </TD>
                      <TD className="text-zinc-600">
                        {row.supplier ?? "—"}
                      </TD>
                      <TD className="text-zinc-600">{row.purchaseRef ?? "—"}</TD>
                      <TD align="right">{row.qty}</TD>
                      <TD align="right">{formatLkr(row.unitCost)}</TD>
                      <TD align="right">{formatLkr(effective)}</TD>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </Page>
  );
}
