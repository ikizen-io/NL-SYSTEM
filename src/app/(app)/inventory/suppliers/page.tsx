import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { SupplierAddForm } from "./SupplierAddForm";
import { SupplierRow } from "./SupplierRow";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { stockIns: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Suppliers</PageTitle>
          <PageDescription>
            Manage supplier names used when receiving stock.
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
          <CardTitle>Add supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierAddForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier list</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Notes</TH>
                <TH align="right">Stock-ins</TH>
                <TH>Status</TH>
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {suppliers.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={5}>
                    No suppliers yet.{" "}
                    <Link href="/inventory/receive" className="underline">
                      Receive stock
                    </Link>{" "}
                    or add one above.
                  </TD>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <SupplierRow
                    key={supplier.id}
                    supplier={{
                      id: supplier.id,
                      name: supplier.name,
                      notes: supplier.notes,
                      active: supplier.active,
                      stockInCount: supplier._count.stockIns,
                    }}
                  />
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>
    </Page>
  );
}
