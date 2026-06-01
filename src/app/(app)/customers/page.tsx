import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLkr } from "@/lib/format";
import { invoiceStatsFromRecord } from "@/lib/invoice-queries";
import { customerSlug } from "@/lib/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

function buildCustomerStats(
  customers: Awaited<ReturnType<typeof loadCustomers>>,
  q: string,
) {
  const normalized = q.trim().toLowerCase();
  return customers
    .map((customer) => {
      let lifetimeRevenue = 0;
      let outstanding = 0;
      let invoiceCount = 0;

      for (const invoice of customer.invoices) {
        if (invoice.status === "CANCELLED") continue;
        const stats = invoiceStatsFromRecord(invoice);
        lifetimeRevenue += stats.revenue;
        invoiceCount += 1;
        if (invoice.status === "ISSUED" && stats.balance > 0) {
          outstanding += stats.balance;
        }
      }

      return {
        name: customer.name,
        phone: customer.phone,
        instagramHandle: customer.instagramHandle,
        invoiceCount,
        lifetimeRevenue,
        outstanding,
      };
    })
    .filter((row) => {
      if (!normalized) return true;
      const haystack = [row.name, row.phone ?? "", row.instagramHandle ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    })
    .sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue || a.name.localeCompare(b.name));
}

async function loadCustomers() {
  return prisma.customer.findMany({
    include: {
      invoices: {
        include: { items: true, payments: true, returnRecords: { include: { items: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const q = sp.q ?? "";
  const customers = await loadCustomers();
  const rows = buildCustomerStats(customers, q);
  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Customers</PageTitle>
          <PageDescription>
            {rows.length} customer{rows.length === 1 ? "" : "s"} •{" "}
            {formatLkr(totalOutstanding)} outstanding
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link href="/sales">Sales</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Customer list</CardTitle>
          <form className="flex gap-2">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search name, phone, or Instagram"
              className="w-72"
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
                <TH>Customer</TH>
                <TH>Phone</TH>
                <TH>Instagram</TH>
                <TH align="right">Invoices</TH>
                <TH align="right">Lifetime spend</TH>
                <TH align="right">Outstanding</TH>
              </tr>
            </THead>
            <TBody>
              {rows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={6}>
                    {customers.length === 0
                      ? "No customers yet. They are created when you record a sale."
                      : "No customers match your search."}
                  </TD>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.name} className="hover:bg-zinc-50">
                    <TD className="font-medium">
                      <Link
                        href={`/customers/${customerSlug(row.name)}`}
                        className="text-zinc-950 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </TD>
                    <TD className="text-zinc-600">{row.phone ?? "—"}</TD>
                    <TD className="text-zinc-600">{row.instagramHandle ?? "—"}</TD>
                    <TD align="right">{row.invoiceCount}</TD>
                    <TD align="right">{formatLkr(row.lifetimeRevenue)}</TD>
                    <TD align="right">
                      {row.outstanding > 0 ? (
                        <Badge tone="warning">{formatLkr(row.outstanding)}</Badge>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </TD>
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
