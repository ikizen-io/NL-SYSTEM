import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { effectiveUnitCost } from "@/lib/costing";
import { formatLkr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

export default async function StockInsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim().toLowerCase();

  const stockIns = await prisma.stockIn.findMany({
    include: {
      variant: { include: { product: true } },
      supplierRecord: true,
    },
    orderBy: { receivedDate: "desc" },
    take: 500,
  });

  const rows = stockIns
    .map((stockIn) => {
      const effective = effectiveUnitCost({
        qty: stockIn.qty,
        unitCost: stockIn.unitCost,
        extraCost: stockIn.extraCost,
      });
      const supplierName =
        stockIn.supplierRecord?.name ?? stockIn.supplier ?? "—";
      return {
        id: stockIn.id,
        receivedDate: stockIn.receivedDate.toISOString().slice(0, 10),
        sku: stockIn.variant.sku,
        label: `${stockIn.variant.product.brand} / ${stockIn.variant.product.modelName} / ${stockIn.variant.sizeLabel}${
          stockIn.variant.color ? ` / ${stockIn.variant.color}` : ""
        }`,
        supplierName,
        purchaseRef: stockIn.purchaseRef ?? "—",
        qty: stockIn.qty,
        unitCost: stockIn.unitCost,
        extraCost: stockIn.extraCost ?? 0,
        effective,
        batchTotal: stockIn.qty * effective,
        notes: stockIn.notes ?? "",
      };
    })
    .filter((row) => {
      if (!q) return true;
      const haystack = [
        row.sku,
        row.label,
        row.supplierName,
        row.purchaseRef,
        row.notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.batchTotal, 0);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Stock-in history</PageTitle>
          <PageDescription>
            {rows.length} batch{rows.length === 1 ? "" : "es"} shown • {totalQty}{" "}
            units • {formatLkr(totalValue)} batch value (listed rows)
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">Inventory</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/inventory/receive">Receive purchase</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Received batches</CardTitle>
          <form className="flex gap-2">
            <Input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search SKU, supplier, purchase ref..."
              className="max-w-sm"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>SKU</TH>
                <TH>Product</TH>
                <TH>Supplier</TH>
                <TH>Purchase ref</TH>
                <TH align="right">Qty</TH>
                <TH align="right">Unit cost</TH>
                <TH align="right">Extra</TH>
                <TH align="right">Effective</TH>
                <TH align="right">Batch total</TH>
                <TH>Notes</TH>
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={11}>
                    No stock-in batches found.{" "}
                    <Link href="/inventory/receive" className="underline">
                      Receive purchase
                    </Link>{" "}
                    to add stock.
                  </TD>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <TD className="whitespace-nowrap">{row.receivedDate}</TD>
                    <TD className="font-mono text-xs">
                      <Link
                        href={`/inventory/${encodeURIComponent(row.sku)}/edit`}
                        className="hover:underline"
                      >
                        {row.sku}
                      </Link>
                    </TD>
                    <TD className="max-w-[220px] truncate">{row.label}</TD>
                    <TD>{row.supplierName}</TD>
                    <TD className="text-zinc-600">{row.purchaseRef}</TD>
                    <TD align="right">{row.qty}</TD>
                    <TD align="right">{formatLkr(row.unitCost)}</TD>
                    <TD align="right">
                      {row.extraCost > 0 ? formatLkr(row.extraCost) : "—"}
                    </TD>
                    <TD align="right">{formatLkr(row.effective)}</TD>
                    <TD align="right">{formatLkr(row.batchTotal)}</TD>
                    <TD className="max-w-[160px] truncate text-zinc-600">
                      {row.notes || "—"}
                    </TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-zinc-500">
        Historical stock-ins are read-only here. Edit the latest unit cost from
        the SKU edit page. Changing old batches does not rewrite past sale costs.
      </p>
    </Page>
  );
}
