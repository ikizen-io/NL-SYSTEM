import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { invoiceStatsFromRecord, salesLedgerInclude } from "@/lib/invoice-queries";
import { formatLkr, formatPct } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { DashboardFilters } from "./DashboardFilters";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

function monthBounds(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

function monthLabel(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    mode?: "month" | "range";
    start?: string;
    end?: string;
  }>;
}) {
  const sp = (await searchParams) ?? {};
  const now = new Date();
  const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const mode = sp.mode === "range" ? "range" : "month";
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : defaultMonth;

  const defaultRangeEnd = now.toISOString().slice(0, 10);
  const oneYearAgo = new Date(now);
  oneYearAgo.setUTCDate(oneYearAgo.getUTCDate() - 365);
  const defaultRangeStart = oneYearAgo.toISOString().slice(0, 10);

  const rangeStart = sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : defaultRangeStart;
  const rangeEnd = sp.end && /^\d{4}-\d{2}-\d{2}$/.test(sp.end) ? sp.end : defaultRangeEnd;

  const bounds =
    mode === "range"
      ? { start: new Date(`${rangeStart}T00:00:00.000Z`), end: new Date(`${rangeEnd}T23:59:59.999Z`) }
      : monthBounds(month);

  const [invoices, expenseAgg] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        issuedDate: { gte: bounds.start, lte: bounds.end },
        status: { in: ["ISSUED", "RETURNED"] },
      },
      include: salesLedgerInclude,
      orderBy: { issuedDate: "desc" },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: bounds.start, lte: bounds.end } },
      _sum: { amount: true },
    }),
  ]);

  let revenue = 0, cogs = 0;
  for (const inv of invoices) {
    const s = invoiceStatsFromRecord(inv);
    revenue += s.revenue;
    cogs += s.cogs;
  }

  const grossProfit = revenue - cogs;
  const totalExpenses = expenseAgg._sum.amount ?? 0;
  const netProfit = grossProfit - totalExpenses;
  const margin = revenue !== 0 ? grossProfit / revenue : 0;

  const periodLabel =
    mode === "range"
      ? `${rangeStart} → ${rangeEnd}`
      : monthLabel(month);

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>
            {periodLabel}
            {" · "}
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </PageDescription>
        </div>
      </PageHeader>

      {/* Filter card */}
      <Card>
        <DashboardFilters
          mode={mode}
          month={month}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      </Card>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Revenue" value={formatLkr(revenue)} />
        <StatCard label="COGS" value={formatLkr(cogs)} sub={`${formatPct(cogs / (revenue || 1))} of rev`} />
        <StatCard label="Gross Profit" value={formatLkr(grossProfit)} highlight />
        <StatCard label="Margin" value={formatPct(margin)} />
        <StatCard label="Expenses" value={formatLkr(totalExpenses)} />
        <StatCard
          label="Net Profit"
          value={formatLkr(netProfit)}
          highlight
          negative={netProfit < 0}
        />
      </div>

      {/* Invoice list */}
      <Card>
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="text-sm font-semibold text-zinc-950">
            Invoices
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {invoices.length > 20
                ? `showing 20 of ${invoices.length}`
                : invoices.length}
            </span>
          </div>
          <Link
            prefetch={false}
            href="/sales"
            className="text-xs text-zinc-500 hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH align="right">Revenue</TH>
                <TH align="right">GP</TH>
              </tr>
            </THead>
            <TBody>
              {invoices.length === 0 ? (
                <tr>
                  <TD className="py-8 text-center text-zinc-400" colSpan={6}>
                    No invoices for this period.
                  </TD>
                </tr>
              ) : (
                invoices.slice(0, 20).map((inv) => {
                  const stats = invoiceStatsFromRecord(inv);
                  const slug = encodeURIComponent(inv.invoiceNo.replace("#", ""));
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50">
                      <TD className="whitespace-nowrap text-xs text-zinc-500">
                        {inv.issuedDate.toISOString().slice(0, 10)}
                      </TD>
                      <TD className="whitespace-nowrap">
                        <Link
                          prefetch={false}
                          href={`/sales/${slug}`}
                          className="font-semibold text-zinc-900 hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TD>
                      <TD className="max-w-[140px] truncate text-zinc-700">
                        {inv.customer?.name ?? <span className="text-zinc-400">—</span>}
                      </TD>
                      <TD>
                        <Badge tone={stats.tone}>{stats.statusLabel}</Badge>
                      </TD>
                      <TD align="right" className="whitespace-nowrap font-medium">
                        {formatLkr(stats.revenue)}
                      </TD>
                      <TD
                        align="right"
                        className={cn(
                          "whitespace-nowrap",
                          stats.gp < 0 ? "text-red-600" : "text-zinc-700",
                        )}
                      >
                        {formatLkr(stats.gp)}
                      </TD>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
        {invoices.length > 20 && (
          <div className="border-t border-zinc-100 px-4 py-2.5 text-center">
            <Link
              prefetch={false}
              href="/sales"
              className="text-xs text-zinc-500 hover:underline"
            >
              + {invoices.length - 20} more invoices — view all in Sales
            </Link>
          </div>
        )}
      </Card>
    </Page>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </div>
        <div
          className={cn(
            "mt-1 text-base font-semibold tabular-nums tracking-tight",
            negative ? "text-red-600" : highlight ? "text-zinc-950" : "text-zinc-700",
          )}
        >
          {value}
        </div>
        {sub && <div className="mt-0.5 text-[11px] text-zinc-400">{sub}</div>}
      </CardContent>
    </Card>
  );
}
