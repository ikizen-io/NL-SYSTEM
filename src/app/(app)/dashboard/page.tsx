import { prisma } from "@/lib/prisma";
import { invoiceFinancialInclude, invoiceStatsFromRecord } from "@/lib/invoice-queries";
import { formatLkr, formatPct } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import { Select } from "@/components/ui/select";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { DashboardPresets } from "./DashboardPresets";

function monthBounds(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map((v) => Number(v));
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
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
  const defaultMonth = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}`;

  const mode = sp.mode === "range" ? "range" : "month";
  const month =
    sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : defaultMonth;

  const defaultRangeEnd = now.toISOString().slice(0, 10);
  const oneYearAgo = new Date(now);
  oneYearAgo.setUTCDate(oneYearAgo.getUTCDate() - 365);
  const defaultRangeStart = oneYearAgo.toISOString().slice(0, 10);

  const rangeStart =
    sp.start && /^\d{4}-\d{2}-\d{2}$/.test(sp.start) ? sp.start : defaultRangeStart;
  const rangeEnd =
    sp.end && /^\d{4}-\d{2}-\d{2}$/.test(sp.end) ? sp.end : defaultRangeEnd;

  const bounds =
    mode === "range"
      ? {
          start: new Date(`${rangeStart}T00:00:00.000Z`),
          end: new Date(`${rangeEnd}T23:59:59.999Z`),
        }
      : monthBounds(month);

  const start = bounds.start;
  const end = bounds.end;

  const invoices = await prisma.invoice.findMany({
    where: {
      issuedDate: { gte: start, lte: end },
      status: { in: ["ISSUED", "RETURNED"] },
    },
    include: invoiceFinancialInclude,
    orderBy: { issuedDate: "desc" },
  });

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
  });

  let revenue = 0;
  let cogs = 0;
  for (const inv of invoices) {
    const stats = invoiceStatsFromRecord(inv);
    revenue += stats.revenue;
    cogs += stats.cogs;
  }

  const grossProfit = revenue - cogs;
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const margin = revenue !== 0 ? grossProfit / revenue : 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Dashboard</PageTitle>
          <PageDescription>
            {mode === "range"
              ? `Range: ${rangeStart} → ${rangeEnd}`
              : `Month: ${month}`}
            {" · "}Revenue vs cash can differ with COD / partial.
          </PageDescription>
        </div>
        <div className="flex flex-col items-end gap-2">
          {mode === "range" ? (
            <DashboardPresets activeStart={rangeStart} activeEnd={rangeEnd} />
          ) : null}
          <form className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-[11px]" htmlFor="mode">
              Mode
            </Label>
            <Select
              id="mode"
              name="mode"
              defaultValue={mode}
            >
              <option value="month">Month</option>
              <option value="range">Date range</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="month" className="text-[11px]">
              Month
            </Label>
            <Input
              id="month"
              name="month"
              type="month"
              defaultValue={month}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="start" className="text-[11px]">
              Start
            </Label>
            <Input
              id="start"
              name="start"
              type="date"
              defaultValue={rangeStart}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="end" className="text-[11px]">
              End
            </Label>
            <Input
              id="end"
              name="end"
              type="date"
              defaultValue={rangeEnd}
              className="h-9"
            />
          </div>
          <Button type="submit" size="sm">
            View
          </Button>
        </form>
        </div>
      </PageHeader>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Revenue" value={formatLkr(revenue)} />
        <Stat label="COGS" value={formatLkr(cogs)} />
        <Stat label="Gross Profit" value={formatLkr(grossProfit)} accent />
        <Stat label="Margin" value={formatPct(margin)} />
        <Stat label="Expenses" value={formatLkr(totalExpenses)} />
        <Stat label="Net Profit" value={formatLkr(netProfit)} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Recent invoices ({mode === "range" ? "range" : "this month"})
          </CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Invoice</TH>
                <TH>Status</TH>
                <TH align="right">Revenue</TH>
                <TH align="right">GP</TH>
              </tr>
            </THead>
            <TBody>
              {invoices.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={5}>
                    No invoices yet for this month.
                  </TD>
                </tr>
              ) : (
                invoices.slice(0, 20).map((inv) => {
                  const stats = invoiceStatsFromRecord(inv);
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50">
                      <TD className="whitespace-nowrap text-zinc-600">
                        {inv.issuedDate.toISOString().slice(0, 10)}
                      </TD>
                      <TD className="whitespace-nowrap font-medium">
                        {inv.invoiceNo}
                      </TD>
                      <TD className="text-zinc-600">
                        {stats.hasPartialReturns
                          ? `${inv.status} (partial return)`
                          : inv.status}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {formatLkr(stats.revenue)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {formatLkr(stats.gp)}
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

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </div>
        <div
          className={`mt-0.5 text-base font-semibold tracking-tight tabular-nums ${
            accent ? "text-zinc-950" : "text-zinc-800"
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

