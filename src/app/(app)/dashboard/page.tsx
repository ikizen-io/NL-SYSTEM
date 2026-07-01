import Link from "next/link";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { invoiceStatsFromRecord, salesLedgerInclude } from "@/lib/invoice-queries";
import { formatLkr, formatPct } from "@/lib/format";
import { percentDelta, priorPeriodBounds, type PeriodDelta } from "@/lib/dashboard";
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
  const priorBounds = priorPeriodBounds(bounds.start, bounds.end);

  const [invoices, expenseAgg, priorInvoices, priorExpenseAgg] = await Promise.all([
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
    prisma.invoice.findMany({
      where: {
        issuedDate: { gte: priorBounds.start, lte: priorBounds.end },
        status: { in: ["ISSUED", "RETURNED"] },
      },
      include: salesLedgerInclude,
    }),
    prisma.expense.aggregate({
      where: { date: { gte: priorBounds.start, lte: priorBounds.end } },
      _sum: { amount: true },
    }),
  ]);

  function summarize(records: typeof invoices, expenseSum: number) {
    let revenue = 0, cogs = 0;
    for (const inv of records) {
      const s = invoiceStatsFromRecord(inv);
      revenue += s.revenue;
      cogs += s.cogs;
    }
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expenseSum;
    const margin = revenue !== 0 ? grossProfit / revenue : 0;
    return { revenue, cogs, grossProfit, totalExpenses: expenseSum, netProfit, margin };
  }

  const current = summarize(invoices, expenseAgg._sum.amount ?? 0);
  const prior = summarize(priorInvoices, priorExpenseAgg._sum.amount ?? 0);
  const { revenue, cogs, grossProfit, totalExpenses, netProfit, margin } = current;

  const deltas = {
    revenue: percentDelta(current.revenue, prior.revenue),
    cogs: percentDelta(current.cogs, prior.cogs),
    grossProfit: percentDelta(current.grossProfit, prior.grossProfit),
    margin: percentDelta(current.margin, prior.margin),
    totalExpenses: percentDelta(current.totalExpenses, prior.totalExpenses),
    netProfit: percentDelta(current.netProfit, prior.netProfit),
  };

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
        <StatCard label="Revenue" value={formatLkr(revenue)} delta={deltas.revenue} />
        <StatCard
          label="COGS"
          value={formatLkr(cogs)}
          sub={`${formatPct(cogs / (revenue || 1))} of rev`}
          delta={deltas.cogs}
          invert
        />
        <StatCard label="Gross Profit" value={formatLkr(grossProfit)} highlight delta={deltas.grossProfit} />
        <StatCard label="Margin" value={formatPct(margin)} delta={deltas.margin} />
        <StatCard label="Expenses" value={formatLkr(totalExpenses)} delta={deltas.totalExpenses} invert />
        <StatCard
          label="Net Profit"
          value={formatLkr(netProfit)}
          highlight
          negative={netProfit < 0}
          delta={deltas.netProfit}
        />
      </div>
      <div className="text-[11px] text-zinc-400">
        vs. previous {mode === "range" ? "period of the same length" : "month"} (
        {priorBounds.start.toISOString().slice(0, 10)} → {priorBounds.end.toISOString().slice(0, 10)})
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
  delta,
  invert,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  negative?: boolean;
  delta?: PeriodDelta;
  /** For cost-like metrics (COGS, Expenses) where "up" is unfavorable. */
  invert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {label}
          </div>
          {delta ? <DeltaBadge delta={delta} invert={invert} /> : null}
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

function DeltaBadge({ delta, invert }: { delta: PeriodDelta; invert?: boolean }) {
  if (delta.direction === "flat" && delta.pct === null) {
    return <span className="text-[10px] text-zinc-400">—</span>;
  }

  const favorable =
    delta.direction === "flat"
      ? null
      : invert
        ? delta.direction === "down"
        : delta.direction === "up";

  const colorClass =
    favorable === null
      ? "text-zinc-400"
      : favorable
        ? "text-emerald-600"
        : "text-rose-600";

  const Icon =
    delta.direction === "up" ? ArrowUp : delta.direction === "down" ? ArrowDown : Minus;

  return (
    <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", colorClass)}>
      <Icon className="h-3 w-3" />
      {delta.pct !== null ? formatPct(Math.abs(delta.pct)) : "new"}
    </span>
  );
}
