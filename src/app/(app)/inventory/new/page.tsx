import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { CreateSkuForm } from "./CreateSkuForm";

export const dynamic = "force-dynamic";

export default async function NewSkuPage() {
  const products = await prisma.product.findMany({
    select: { brand: true, category: true },
  });
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort();
  const categories = Array.from(
    new Set(products.map((p) => p.category)),
  ).sort();

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Add SKU</PageTitle>
          <PageDescription>
            Define a catalog SKU. Use this when you want to set up a product
            ahead of stock arriving. To add stock, use Receive purchase.
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
          <CardTitle>SKU details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateSkuForm brands={brands} categories={categories} />
        </CardContent>
      </Card>
    </Page>
  );
}
