import Link from "next/link";
import { notFound } from "next/navigation";
import { formatLkr, formatPct } from "@/lib/format";
import { invoiceStatsFromRecord } from "@/lib/invoice-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { loadCustomerBySlug } from "../actions";
import { CustomerEditForm } from "./CustomerEditForm";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customer: string }>;
}) {
  const { customer: customerSlug } = await params;
  const customer = await loadCustomerBySlug(customerSlug);
  if (!customer) notFound();

  let lifetimeRevenue = 0;
  let outstanding = 0;
  const invoiceRows = customer.invoices
    .filter((invoice) => invoice.status !== "CANCELLED")
    .map((invoice) => {
      const stats = invoiceStatsFromRecord(invoice);
      return { invoice, stats };
    });

  for (const row of invoiceRows) {
    lifetimeRevenue += row.stats.revenue;
    if (row.invoice.status === "ISSUED" && row.stats.balance > 0) {
      outstanding += row.stats.balance;
    }
  }

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <PageTitle>{customer.name}</PageTitle>
          <PageDescription>
            {invoiceRows.length} invoice{invoiceRows.length === 1 ? "" : "s"} •{" "}
            {formatLkr(lifetimeRevenue)} lifetime spend
            {outstanding > 0 ? ` • ${formatLkr(outstanding)} outstanding` : ""}
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/customers">All customers</Link>
          </Button>
          <Button asChild size="sm">
            <Link prefetch={false} href="/sales">New sale</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Lifetime spend
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {formatLkr(lifetimeRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Outstanding
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {formatLkr(outstanding)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Invoices
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {invoiceRows.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerEditForm customer={customer} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Invoice</TH>
                <TH>Status</TH>
                <TH align="right">Total</TH>
                <TH align="right">Paid</TH>
                <TH align="right">Balance</TH>
                <TH align="right">GP</TH>
              </tr>
            </THead>
            <TBody>
              {invoiceRows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={7}>
                    No invoices for this customer yet.
                  </TD>
                </tr>
              ) : (
                invoiceRows.map(({ invoice, stats }) => {
                  const slug = encodeURIComponent(invoice.invoiceNo.replace("#", ""));
                  return (
                    <tr key={invoice.id} className="hover:bg-zinc-50">
                      <TD className="whitespace-nowrap text-zinc-600">
                        {invoice.issuedDate.toISOString().slice(0, 10)}
                      </TD>
                      <TD className="font-medium">
                        <Link prefetch={false} href={`/sales/${slug}`} className="hover:underline">
                          {invoice.invoiceNo}
                        </Link>
                      </TD>
                      <TD>
                        <Badge tone={stats.tone}>{stats.statusLabel}</Badge>
                      </TD>
                      <TD align="right">{formatLkr(stats.revenue)}</TD>
                      <TD align="right">{formatLkr(stats.paid)}</TD>
                      <TD align="right">{formatLkr(stats.balance)}</TD>
                      <TD align="right">
                        <div>{formatLkr(stats.gp)}</div>
                        <div className="text-[11px] text-zinc-500">
                          {formatPct(stats.margin)}
                        </div>
                      </TD>
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
