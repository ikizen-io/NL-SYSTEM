import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatLkr, formatPct } from "@/lib/format";
import { invoiceFinancialInclude, invoiceStatsFromRecord } from "@/lib/invoice-queries";
import { customerSlug } from "@/lib/invoices";
import { computeInventoryRows } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [variants, allIssuedInvoices, expenses] = await Promise.all([
    prisma.variant.findMany({
      where: { active: true },
      include: {
        product: true,
        stockIns: true,
        adjustments: true,
        invoiceItems: { include: { invoice: { select: { status: true } } } },
      },
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["ISSUED", "RETURNED"] } },
      include: {
        ...invoiceFinancialInclude,
        customer: true,
        payments: true,
        items: {
          include: {
            variant: { include: { product: true } },
            returnItems: true,
          },
        },
      },
      orderBy: { issuedDate: "desc" },
    }),
    prisma.expense.findMany({ orderBy: { date: "desc" } }),
  ]);

  const inventoryRows = computeInventoryRows(variants);
  const lowStockRows = inventoryRows
    .filter((row) => row.currentStock <= 1)
    .sort((a, b) => a.currentStock - b.currentStock || a.sku.localeCompare(b.sku));

  const totalUnits = inventoryRows.reduce(
    (sum, row) => sum + Math.max(0, row.currentStock),
    0,
  );
  const totalValuation = inventoryRows.reduce((sum, row) => sum + row.stockValue, 0);

  // outstanding balances — issued invoices only
  const outstandingRows = allIssuedInvoices
    .filter((inv) => inv.status === "ISSUED")
    .map((invoice) => ({ invoice, stats: invoiceStatsFromRecord(invoice) }))
    .filter(({ stats }) => stats.balance > 0)
    .sort((a, b) => b.stats.balance - a.stats.balance);

  const totalOutstanding = outstandingRows.reduce(
    (sum, row) => sum + row.stats.balance,
    0,
  );

  // cash received vs revenue
  const totalRevenue = allIssuedInvoices.reduce((sum, inv) => {
    const stats = invoiceStatsFromRecord(inv);
    return sum + stats.revenue;
  }, 0);
  const totalCashReceived = allIssuedInvoices.reduce((sum, inv) => {
    const stats = invoiceStatsFromRecord(inv);
    return sum + stats.paid;
  }, 0);
  const totalPending = totalRevenue - totalCashReceived;

  // product profitability by brand + model
  type ProfitRow = {
    brand: string;
    modelName: string;
    qtySold: number;
    revenue: number;
    cogs: number;
    gp: number;
  };

  const profitMap = new Map<string, ProfitRow>();

  for (const invoice of allIssuedInvoices) {
    const stats = invoiceStatsFromRecord(invoice);
    if (stats.derivedStatus === "CANCELLED") continue;

    for (const item of invoice.items) {
      const returnedQty = item.returnItems.reduce((s, r) => s + r.qty, 0);
      const netQty = item.qty - returnedQty;
      if (netQty <= 0) continue;

      const brand = item.variant.product.brand;
      const modelName = item.variant.product.modelName;
      const key = `${brand}||${modelName}`;

      const lineRevenue = item.unitPrice * netQty;
      const lineCogs = item.unitCostAtSale * netQty;

      const lineGp = lineRevenue - lineCogs;
      const existing = profitMap.get(key);
      if (existing) {
        existing.qtySold += netQty;
        existing.revenue += lineRevenue;
        existing.cogs += lineCogs;
        existing.gp += lineGp;
      } else {
        profitMap.set(key, {
          brand,
          modelName,
          qtySold: netQty,
          revenue: lineRevenue,
          cogs: lineCogs,
          gp: lineGp,
        });
      }
    }
  }

  const profitRows = [...profitMap.values()]
    .sort((a, b) => b.gp - a.gp)
    .slice(0, 50);

  // expenses by category
  type ExpenseCategoryRow = { category: string; total: number; count: number };
  const expenseCatMap = new Map<string, ExpenseCategoryRow>();
  for (const exp of expenses) {
    const cat = exp.category.trim() || "Uncategorised";
    const existing = expenseCatMap.get(cat);
    if (existing) {
      existing.total += exp.amount;
      existing.count += 1;
    } else {
      expenseCatMap.set(cat, { category: cat, total: exp.amount, count: 1 });
    }
  }
  const expenseCatRows = [...expenseCatMap.values()].sort(
    (a, b) => b.total - a.total,
  );
  const totalExpenses = expenseCatRows.reduce((s, r) => s + r.total, 0);

  return (
    <Page className="space-y-5">
      <PageHeader>
        <div>
          <PageTitle>Reports</PageTitle>
          <PageDescription>
            Financial overview, product performance, and operational status.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/inventory/stock-ins">Stock-in history</Link>
          </Button>
        </PageActions>
      </PageHeader>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Outstanding
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {formatLkr(totalOutstanding)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {outstandingRows.length} open invoice
              {outstandingRows.length === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Low stock SKUs
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {lowStockRows.length}
            </div>
            <div className="mt-1 text-xs text-zinc-500">1 unit or less on hand</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Inventory valuation
            </div>
            <div className="mt-1 text-base font-semibold tabular-nums">
              {formatLkr(totalValuation)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {totalUnits} units at latest effective cost
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash received vs revenue */}
      <Card>
        <CardHeader>
          <CardTitle>Cash received vs revenue</CardTitle>
        </CardHeader>
        <div className="grid gap-px bg-zinc-100 sm:grid-cols-3">
          <div className="bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Total revenue
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {formatLkr(totalRevenue)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Net of returns</div>
          </div>
          <div className="bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Cash collected
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">
              {formatLkr(totalCashReceived)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {totalRevenue > 0
                ? `${formatPct(totalCashReceived / totalRevenue)} of revenue`
                : "—"}
            </div>
          </div>
          <div className="bg-white p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Still pending
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-amber-700">
              {formatLkr(totalPending)}
            </div>
            <div className="mt-1 text-xs text-zinc-500">Outstanding balance</div>
          </div>
        </div>
      </Card>

      {/* Outstanding balances */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding balances</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH>Date</TH>
                <TH align="right">Total</TH>
                <TH align="right">Paid</TH>
                <TH align="right">Balance</TH>
              </tr>
            </THead>
            <TBody>
              {outstandingRows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={6}>
                    No outstanding invoices — all issued sales are paid in full.
                  </TD>
                </tr>
              ) : (
                outstandingRows.map(({ invoice, stats }) => {
                  const slug = encodeURIComponent(invoice.invoiceNo.replace("#", ""));
                  return (
                    <tr key={invoice.id} className="hover:bg-zinc-50">
                      <TD className="font-medium">
                        <Link prefetch={false} href={`/sales/${slug}`} className="hover:underline">
                          {invoice.invoiceNo}
                        </Link>
                      </TD>
                      <TD>
                        {invoice.customer?.name ? (
                          <Link prefetch={false}
                            href={`/customers/${customerSlug(invoice.customer.name)}`}
                            className="hover:underline"
                          >
                            {invoice.customer.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="text-zinc-600">
                        {invoice.issuedDate.toISOString().slice(0, 10)}
                      </TD>
                      <TD align="right">{formatLkr(stats.revenue)}</TD>
                      <TD align="right">{formatLkr(stats.paid)}</TD>
                      <TD align="right">
                        <Badge tone="warning">{formatLkr(stats.balance)}</Badge>
                      </TD>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Product profitability */}
      <Card>
        <CardHeader>
          <CardTitle>Product profitability (top 50 by gross profit)</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Brand</TH>
                <TH>Model</TH>
                <TH align="right">Units sold</TH>
                <TH align="right">Revenue</TH>
                <TH align="right">COGS</TH>
                <TH align="right">Gross profit</TH>
                <TH align="right">Margin</TH>
              </tr>
            </THead>
            <TBody>
              {profitRows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={7}>
                    No sales data yet.
                  </TD>
                </tr>
              ) : (
                profitRows.map((row) => (
                  <tr key={`${row.brand}||${row.modelName}`} className="hover:bg-zinc-50">
                    <TD className="text-xs text-zinc-500">{row.brand}</TD>
                    <TD className="font-medium">{row.modelName}</TD>
                    <TD align="right">{row.qtySold}</TD>
                    <TD align="right">{formatLkr(row.revenue)}</TD>
                    <TD align="right">{formatLkr(row.cogs)}</TD>
                    <TD align="right">
                      <span className={row.gp >= 0 ? "text-emerald-700" : "text-red-600"}>
                        {formatLkr(row.gp)}
                      </span>
                    </TD>
                    <TD align="right">
                      <Badge tone={row.gp >= 0 ? "success" : "danger"}>
                        {row.revenue > 0 ? formatPct(row.gp / row.revenue) : "—"}
                      </Badge>
                    </TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Expenses by category */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses by category</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Category</TH>
                <TH align="right">Entries</TH>
                <TH align="right">Total</TH>
                <TH align="right">% of spend</TH>
              </tr>
            </THead>
            <TBody>
              {expenseCatRows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={4}>
                    No expenses recorded yet.
                  </TD>
                </tr>
              ) : (
                expenseCatRows.map((row) => (
                  <tr key={row.category} className="hover:bg-zinc-50">
                    <TD className="font-medium">{row.category}</TD>
                    <TD align="right">{row.count}</TD>
                    <TD align="right">{formatLkr(row.total)}</TD>
                    <TD align="right">
                      {totalExpenses > 0
                        ? formatPct(row.total / totalExpenses)
                        : "—"}
                    </TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Low stock */}
      <Card>
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>SKU</TH>
                <TH>Product</TH>
                <TH align="right">Stock</TH>
                <TH align="right">Target</TH>
              </tr>
            </THead>
            <TBody>
              {lowStockRows.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={4}>
                    No low-stock SKUs right now.
                  </TD>
                </tr>
              ) : (
                lowStockRows.map((row) => (
                  <tr key={row.sku} className="hover:bg-zinc-50">
                    <TD className="font-mono text-xs">
                      <Link prefetch={false}
                        href={`/inventory/${encodeURIComponent(row.sku)}/edit`}
                        className="hover:underline"
                      >
                        {row.sku}
                      </Link>
                    </TD>
                    <TD>
                      {row.modelName}
                      <span className="text-zinc-500">
                        {" "}
                        • {row.sizeLabel}
                        {row.color ? ` / ${row.color}` : ""}
                      </span>
                    </TD>
                    <TD align="right">
                      <Badge tone={row.currentStock <= 0 ? "danger" : "warning"}>
                        {row.currentStock}
                      </Badge>
                    </TD>
                    <TD align="right">
                      {row.targetPrice ? formatLkr(row.targetPrice) : "—"}
                    </TD>
                  </tr>
                ))
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {/* Inventory valuation */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory valuation</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>SKU</TH>
                <TH>Product</TH>
                <TH align="right">Stock</TH>
                <TH align="right">Unit cost</TH>
                <TH align="right">Value</TH>
              </tr>
            </THead>
            <TBody>
              {inventoryRows.filter((row) => row.currentStock > 0).length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={5}>
                    No stock on hand to value.
                  </TD>
                </tr>
              ) : (
                inventoryRows
                  .filter((row) => row.currentStock > 0)
                  .sort((a, b) => b.stockValue - a.stockValue)
                  .map((row) => (
                    <tr key={row.sku} className="hover:bg-zinc-50">
                      <TD className="font-mono text-xs">{row.sku}</TD>
                      <TD className="max-w-[260px] truncate">
                        {row.brand} / {row.modelName}
                      </TD>
                      <TD align="right">{row.currentStock}</TD>
                      <TD align="right">{formatLkr(row.unitCost)}</TD>
                      <TD align="right">{formatLkr(row.stockValue)}</TD>
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
