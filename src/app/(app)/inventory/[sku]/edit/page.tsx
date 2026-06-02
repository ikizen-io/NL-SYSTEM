import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { effectiveUnitCost } from "@/lib/costing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { EditSkuForm } from "./EditSkuForm";
import { StockInHistory } from "./StockInHistory";

export const dynamic = "force-dynamic";

export default async function EditSkuPage({
  params,
}: {
  params: Promise<{ sku: string }>;
}) {
  const { sku } = await params;
  const decodedSku = decodeURIComponent(sku);
  const variant = await prisma.variant.findUnique({
    where: { sku: decodedSku },
    include: {
      product: true,
      stockIns: {
        orderBy: { receivedDate: "desc" },
        include: { supplierRecord: true },
      },
    },
  });

  if (!variant || !variant.active) notFound();

  const latestStockIn = variant.stockIns[0] ?? null;
  const productList = await prisma.product.findMany({
    select: { brand: true, category: true },
  });
  const brands = Array.from(
    new Set([
      ...productList.map((product) => product.brand),
      variant.product.brand,
    ]),
  ).sort();
  const categories = Array.from(
    new Set([
      ...productList.map((product) => product.category),
      variant.product.category,
    ]),
  ).sort();

  const effectiveCost = latestStockIn
    ? effectiveUnitCost({
        qty: latestStockIn.qty,
        unitCost: latestStockIn.unitCost,
        extraCost: latestStockIn.extraCost ?? null,
      })
    : 0;

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <PageTitle>Edit SKU</PageTitle>
          <PageDescription>
            Update catalog details and current target/cost fields.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/stock-ins">Stock-in history</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory">Back</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{variant.sku}</CardTitle>
        </CardHeader>
        <CardContent>
          <EditSkuForm
            variant={variant}
            brands={brands}
            categories={categories}
            effectiveCost={effectiveCost}
            latestStockIn={
              latestStockIn
                ? {
                    id: latestStockIn.id,
                    unitCost: latestStockIn.unitCost,
                    extraCost: latestStockIn.extraCost,
                  }
                : null
            }
          />
        </CardContent>
      </Card>

      <StockInHistory sku={variant.sku} stockIns={variant.stockIns} />
    </Page>
  );
}
