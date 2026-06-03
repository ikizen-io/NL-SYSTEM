import { prisma } from "@/lib/prisma";
import { formatLkr, formatPct } from "@/lib/format";
import { customerSlug } from "@/lib/invoices";
import { invoiceStatsFromRecord, salesLedgerInclude } from "@/lib/invoice-queries";
import { variantStockInclude } from "@/lib/inventory-queries";
import {
  buildSalesInvoiceWhere,
  filterInvoicesByDerivedStatus,
  paginateInvoices,
  parseSalesFilters,
} from "@/lib/sales-filters";
import { NewSaleForm } from "./NewSaleForm";
import { SalesLedgerFilters, salesFilterQuery } from "./SalesLedgerFilters";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Page,
  PageActions,
  PageDescription,
  PageHeader,
  PageTitle,
} from "@/components/ui/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ban, MoreHorizontal, Pencil, Printer } from "lucide-react";
import { voidInvoice } from "./[invoice]/actions";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const pageSize = 50;

function availableStock(variant: {
  stockIns: { qty: number }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
}) {
  const received = variant.stockIns.reduce((sum, s) => sum + s.qty, 0);
  const adjusted = variant.adjustments.reduce((sum, a) => sum + a.qtyDelta, 0);
  const sold = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  return received + adjusted - sold;
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const filters = parseSalesFilters(sp);
  const invoiceWhere = buildSalesInvoiceWhere(filters);
  const usesDerivedStatus =
    filters.status === "paid" || filters.status === "pending";

  const [variants, customers, products] = await Promise.all([
    prisma.variant.findMany({
      where: { active: true },
      include: variantStockInclude,
      orderBy: { sku: "asc" },
    }),
    prisma.customer.findMany({
      select: { name: true, phone: true, instagramHandle: true, address: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      select: { brand: true, category: true },
      distinct: ["brand", "category"],
      orderBy: [{ brand: "asc" }, { category: "asc" }],
    }),
  ]);

  const brands = [...new Set(products.map((p) => p.brand))].sort();
  const categories = [...new Set(products.map((p) => p.category))].sort();

  let invoices: Awaited<
    ReturnType<typeof prisma.invoice.findMany<{ include: typeof salesLedgerInclude }>>
  >;
  let invoiceCount: number;
  let page = filters.page;
  let totalPages: number;

  if (usesDerivedStatus) {
    const allInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      include: salesLedgerInclude,
      orderBy: { issuedDate: "desc" },
    });
    const filtered = filterInvoicesByDerivedStatus(allInvoices, filters.status);
    const paginated = paginateInvoices(filtered, filters.page, pageSize);
    invoices = paginated.items;
    invoiceCount = paginated.total;
    page = paginated.page;
    totalPages = paginated.totalPages;
  } else {
    [invoices, invoiceCount] = await Promise.all([
      prisma.invoice.findMany({
        where: invoiceWhere,
        include: salesLedgerInclude,
        orderBy: { issuedDate: "desc" },
        skip: (filters.page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.invoice.count({ where: invoiceWhere }),
    ]);
    totalPages = Math.max(1, Math.ceil(invoiceCount / pageSize));
    page = filters.page;
  }

  // Quick summary across the current filtered set
  let totalRevenue = 0;
  let totalOutstanding = 0;
  let outstandingCount = 0;
  for (const inv of invoices) {
    const s = invoiceStatsFromRecord(inv);
    totalRevenue += s.revenue;
    if (s.balance > 0) { totalOutstanding += s.balance; outstandingCount += 1; }
  }

  const allSaleSkus = variants.map((variant) => ({
    sku: variant.sku,
    label: `${variant.sku} — ${variant.product.brand} / ${variant.product.modelName} / ${variant.sizeLabel}${variant.color ? ` / ${variant.color}` : ""}`,
    targetPrice: variant.targetPrice,
    stock: availableStock(variant),
  }));
  const saleSkus = allSaleSkus.filter((sku) => sku.stock > 0);

  const filterValues = {
    q: filters.q,
    from: filters.from,
    to: filters.to,
    status: filters.status,
    customer: filters.customer,
    payMethod: filters.payMethod,
    brand: filters.brand,
    category: filters.category,
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Sales</PageTitle>
          <PageDescription>
            Record sales, collect payments, and manage invoices.
          </PageDescription>
        </div>
        <PageActions>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/customers">Customers</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link prefetch={false} href="/dashboard">Dashboard</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <NewSaleForm skus={saleSkus} allSkus={allSaleSkus} customers={customers} />

      <Card>
        {/* Card title + summary stats */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div className="text-sm font-semibold tracking-[-0.01em] text-zinc-950">
            Invoices
            {invoiceCount > 0 && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {invoiceCount.toLocaleString()} total
              </span>
            )}
          </div>
          {invoices.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span>
                Revenue{" "}
                <span className="font-semibold text-zinc-800">
                  {formatLkr(totalRevenue)}
                </span>{" "}
                <span className="text-zinc-400">(this page)</span>
              </span>
              {totalOutstanding > 0 && (
                <span>
                  Outstanding{" "}
                  <span className="font-semibold text-amber-700">
                    {formatLkr(totalOutstanding)}
                  </span>{" "}
                  <span className="text-zinc-400">
                    ({outstandingCount} invoice{outstandingCount !== 1 ? "s" : ""})
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Filter panel */}
        <SalesLedgerFilters
          values={filterValues}
          customers={customers.map((c) => ({ name: c.name }))}
          brands={brands}
          categories={categories}
        />

        {/* Table */}
        <div className="overflow-auto">
          <Table>
            <THead>
              <tr>
                <TH>Date</TH>
                <TH>Invoice</TH>
                <TH>Customer</TH>
                <TH>Items</TH>
                <TH>Status</TH>
                <TH align="right">Total</TH>
                <TH align="right">Paid</TH>
                <TH align="right">Balance</TH>
                <TH align="right">GP</TH>
                <TH align="right" />
              </tr>
            </THead>
            <TBody>
              {invoices.length === 0 ? (
                <tr>
                  <TD className="py-10 text-zinc-400" colSpan={10}>
                    No invoices match these filters.
                  </TD>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const stats = invoiceStatsFromRecord(inv);
                  const itemsLabel = inv.items
                    .slice(0, 2)
                    .map(
                      (it) =>
                        `${it.variant.product.modelName} / ${it.variant.sizeLabel}${it.variant.color ? ` / ${it.variant.color}` : ""}`,
                    )
                    .join(", ");
                  const more =
                    inv.items.length > 2
                      ? ` +${inv.items.length - 2} more`
                      : "";

                  const slug = encodeURIComponent(inv.invoiceNo.replace("#", ""));

                  const rowClass = cn(
                    "transition-colors",
                    inv.status === "CANCELLED"
                      ? "opacity-50 hover:opacity-70"
                      : stats.balance > 0
                        ? "bg-amber-50/40 hover:bg-amber-50/70"
                        : "hover:bg-zinc-50",
                  );

                  return (
                    <tr key={inv.id} className={rowClass}>
                      <TD className="whitespace-nowrap text-zinc-500 text-xs">
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
                      <TD className="max-w-[160px] truncate">
                        {inv.customer?.name ? (
                          <Link
                            prefetch={false}
                            href={`/customers/${customerSlug(inv.customer.name)}`}
                            className="text-zinc-800 hover:underline"
                          >
                            {inv.customer.name}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </TD>
                      <TD className="max-w-[240px] truncate text-xs text-zinc-500">
                        {itemsLabel}
                        {more ? (
                          <span className="ml-1 text-zinc-400">{more}</span>
                        ) : null}
                      </TD>
                      <TD>
                        <Badge tone={stats.tone}>{stats.statusLabel}</Badge>
                      </TD>
                      <TD align="right" className="whitespace-nowrap font-medium">
                        {formatLkr(stats.revenue)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap text-zinc-600">
                        {formatLkr(stats.paid)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {stats.balance > 0 ? (
                          <span className="font-medium text-amber-700">
                            {formatLkr(stats.balance)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        <div className="font-medium">{formatLkr(stats.gp)}</div>
                        <div className="text-[11px] text-zinc-400">
                          {formatPct(stats.margin)}
                        </div>
                      </TD>
                      <TD align="right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              title="Actions"
                              className="h-7 w-7"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link prefetch={false} href={`/sales/${slug}`}>
                                <Pencil className="h-4 w-4 text-zinc-400" />
                                Manage invoice
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link prefetch={false} href={`/invoices/${slug}/print`}>
                                <Printer className="h-4 w-4 text-zinc-400" />
                                Print / PDF
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              asChild
                              disabled={inv.status === "CANCELLED"}
                            >
                              <form action={voidInvoice} className="w-full">
                                <input type="hidden" name="invoiceNo" value={inv.invoiceNo} />
                                <button
                                  type="submit"
                                  disabled={inv.status === "CANCELLED"}
                                  className="flex w-full items-center gap-2 text-left text-red-700 disabled:text-zinc-400"
                                >
                                  <Ban className="h-4 w-4" />
                                  Void invoice
                                </button>
                              </form>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TD>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3">
          <p className="text-xs text-zinc-500">
            Page{" "}
            <span className="font-medium text-zinc-800">{page}</span>
            {" "}of{" "}
            <span className="font-medium text-zinc-800">{totalPages}</span>
            {" · "}
            {invoiceCount.toLocaleString()} invoice
            {invoiceCount !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-1.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(page <= 1 && "pointer-events-none opacity-40")}
            >
              <Link
                prefetch={false}
                href={`/sales?${salesFilterQuery({
                  ...filterValues,
                  page: String(Math.max(1, page - 1)),
                })}`}
              >
                ← Previous
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(page >= totalPages && "pointer-events-none opacity-40")}
            >
              <Link
                prefetch={false}
                href={`/sales?${salesFilterQuery({
                  ...filterValues,
                  page: String(Math.min(totalPages, page + 1)),
                })}`}
              >
                Next →
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
