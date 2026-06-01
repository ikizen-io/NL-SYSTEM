import { prisma } from "@/lib/prisma";
import { formatLkr, formatPct } from "@/lib/format";
import {
  invoiceFinancialInclude,
  invoiceStatsFromRecord,
  toReturnRecordInput,
} from "@/lib/invoice-queries";
import { returnedQtyByItem } from "@/lib/returns";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";

export const dynamic = "force-dynamic";

type BrandAgg = {
  brand: string;
  salesCount: number;
  revenue: number;
  cogs: number;
  gp: number;
};

type CustomerAgg = {
  name: string;
  orders: number;
  spent: number;
  gp: number;
};

export default async function InsightsPage() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["ISSUED", "RETURNED"] } },
    include: {
      ...invoiceFinancialInclude,
      customer: true,
      items: { include: { variant: { include: { product: true } } } },
    },
    orderBy: { issuedDate: "desc" },
    take: 2000,
  });

  const brandMap = new Map<string, BrandAgg>();
  const customerMap = new Map<string, CustomerAgg>();

  for (const inv of invoices) {
    const stats = invoiceStatsFromRecord(inv);
    const returned = returnedQtyByItem(toReturnRecordInput(inv.returnRecords));

    const customerName = inv.customer?.name ?? "Unknown";
    const cust = customerMap.get(customerName) ?? {
      name: customerName,
      orders: 0,
      spent: 0,
      gp: 0,
    };
    if (inv.status === "ISSUED") cust.orders += 1;
    cust.spent += stats.revenue;
    cust.gp += stats.gp;
    customerMap.set(customerName, cust);

    for (const it of inv.items) {
      const qty =
        inv.status === "RETURNED"
          ? -it.qty
          : Math.max(0, it.qty - (returned.get(it.id) ?? 0));
      if (qty === 0) continue;

      const brand = it.variant.product.brand;
      const agg = brandMap.get(brand) ?? {
        brand,
        salesCount: 0,
        revenue: 0,
        cogs: 0,
        gp: 0,
      };
      if (qty > 0) agg.salesCount += 1;
      agg.revenue += qty * it.unitPrice;
      agg.cogs += qty * it.unitCostAtSale;
      agg.gp += qty * (it.unitPrice - it.unitCostAtSale);
      brandMap.set(brand, agg);
    }
  }

  const brandRows = [...brandMap.values()].sort((a, b) => b.gp - a.gp);
  const customerRows = [...customerMap.values()]
    .filter((c) => c.name !== "Unknown")
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 15);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Insights</PageTitle>
          <PageDescription>
            Brand performance and top customers, derived automatically from sales.
          </PageDescription>
        </div>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brand performance</CardTitle>
          </CardHeader>
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Brand</TH>
                  <TH align="right"># Sales</TH>
                  <TH align="right">Revenue</TH>
                  <TH align="right">COGS</TH>
                  <TH align="right">GP</TH>
                  <TH align="right">Avg Margin</TH>
                </tr>
              </THead>
              <TBody>
                {brandRows.length === 0 ? (
                  <tr>
                    <TD className="py-6 text-zinc-500" colSpan={6}>
                      No sales yet.
                    </TD>
                  </tr>
                ) : (
                  brandRows.map((b) => {
                    const margin = b.revenue !== 0 ? b.gp / b.revenue : 0;
                    return (
                      <tr key={b.brand} className="hover:bg-zinc-50">
                        <TD className="font-medium">{b.brand}</TD>
                        <TD align="right">{b.salesCount}</TD>
                        <TD align="right">{formatLkr(b.revenue)}</TD>
                        <TD align="right">{formatLkr(b.cogs)}</TD>
                        <TD align="right">{formatLkr(b.gp)}</TD>
                        <TD align="right">{formatPct(margin)}</TD>
                      </tr>
                    );
                  })
                )}
              </TBody>
            </Table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top customers</CardTitle>
          </CardHeader>
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH align="right"># Orders</TH>
                  <TH align="right">Total Spent</TH>
                  <TH align="right">Total GP</TH>
                </tr>
              </THead>
              <TBody>
                {customerRows.length === 0 ? (
                  <tr>
                    <TD className="py-6 text-zinc-500" colSpan={4}>
                      No customers yet.
                    </TD>
                  </tr>
                ) : (
                  customerRows.map((c) => (
                    <tr key={c.name} className="hover:bg-zinc-50">
                      <TD className="font-medium">{c.name}</TD>
                      <TD align="right">{c.orders}</TD>
                      <TD align="right">{formatLkr(c.spent)}</TD>
                      <TD align="right">{formatLkr(c.gp)}</TD>
                    </tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </Card>
      </div>
    </Page>
  );
}
