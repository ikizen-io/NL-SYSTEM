import { prisma } from "@/lib/prisma";
import { formatLkr } from "@/lib/format";
import { computeInventoryRows } from "@/lib/inventory";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import Link from "next/link";
import { InventoryTable } from "./InventoryTable";

export const dynamic = "force-dynamic";

async function loadVariants(showArchived: boolean) {
  return prisma.variant.findMany({
    where: showArchived ? undefined : { active: true },
    include: {
      product: true,
      stockIns: true,
      adjustments: true,
      invoiceItems: { include: { invoice: { select: { status: true } } } },
    },
  });
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ show?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const showArchived = sp.show === "archived";
  const variants = await loadVariants(showArchived);
  const rows = computeInventoryRows(variants);

  const totalStock = rows.reduce((sum, r) => sum + Math.max(0, r.currentStock), 0);
  const reorderCount = rows.filter((r) => r.active && r.currentStock <= 1).length;
  const totalValuation = rows.reduce((sum, r) => sum + r.stockValue, 0);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Inventory</PageTitle>
          <PageDescription>
            {rows.length} SKU{rows.length === 1 ? "" : "s"} • {totalStock} units in stock
            {reorderCount > 0 ? ` • ${reorderCount} need reorder` : ""}
            {" • "}
            {formatLkr(totalValuation)} on hand
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/reports">Reports</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/stock-ins">Stock-in history</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href={showArchived ? "/inventory" : "/inventory?show=archived"}>
              {showArchived ? "Active only" : "Show archived"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/suppliers">Suppliers</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/adjust">Adjust stock</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/new">Add SKU</Link>
          </Button>
          <Button asChild size="sm">
            <Link prefetch={false} href="/inventory/receive">Receive purchase</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{showArchived ? "All SKUs" : "Active SKUs"}</CardTitle>
        </CardHeader>
        <InventoryTable rows={rows} showArchived={showArchived} />
      </Card>
    </Page>
  );
}
