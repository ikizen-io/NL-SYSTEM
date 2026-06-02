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
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, THead, TD, TH } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Page, PageActions, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ban, MoreHorizontal, Pencil, Printer } from "lucide-react";
import { voidInvoice } from "./[invoice]/actions";

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
      select: {
        name: true,
        phone: true,
        instagramHandle: true,
        address: true,
      },
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
    ReturnType<
      typeof prisma.invoice.findMany<{ include: typeof salesLedgerInclude }>
    >
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

  const saleSkus = variants
    .map((variant) => ({
      sku: variant.sku,
      label: `${variant.sku} — ${variant.product.brand} / ${
        variant.product.modelName
      } / ${variant.sizeLabel}${variant.color ? ` / ${variant.color}` : ""}`,
      targetPrice: variant.targetPrice,
      stock: availableStock(variant),
    }))
    .filter((sku) => sku.stock > 0);

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
          <PageTitle>Sales Ledger</PageTitle>
          <PageDescription>
            Record sales, collect payments, and manage invoices from one flow.
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

      <NewSaleForm skus={saleSkus} customers={customers} />

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <SalesLedgerFilters
            values={filterValues}
            customers={customers.map((customer) => ({ name: customer.name }))}
            brands={brands}
            categories={categories}
          />
        </CardHeader>
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
                <TH align="right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {invoices.length === 0 ? (
                <tr>
                  <TD className="py-6 text-zinc-500" colSpan={10}>
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
                        `${it.variant.product.modelName} / ${it.variant.sizeLabel}${
                          it.variant.color ? ` / ${it.variant.color}` : ""
                        }`,
                    )
                    .join(", ");
                  const more = inv.items.length > 2 ? ` +${inv.items.length - 2}` : "";

                  const slug = encodeURIComponent(inv.invoiceNo.replace("#", ""));
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50">
                      <TD className="whitespace-nowrap text-zinc-600">
                        {inv.issuedDate.toISOString().slice(0, 10)}
                      </TD>
                      <TD className="whitespace-nowrap font-medium">
                        <Link prefetch={false}
                          href={`/sales/${slug}`}
                          className="text-zinc-950 hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TD>
                      <TD className="max-w-[180px] truncate">
                        {inv.customer?.name ? (
                          <Link prefetch={false}
                            href={`/customers/${customerSlug(inv.customer.name)}`}
                            className="text-zinc-950 hover:underline"
                          >
                            {inv.customer.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="max-w-[280px] truncate text-zinc-600">
                        {itemsLabel}
                        {more}
                      </TD>
                      <TD>
                        <Badge tone={stats.tone}>{stats.statusLabel}</Badge>
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {formatLkr(stats.revenue)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {formatLkr(stats.paid)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        {formatLkr(stats.balance)}
                      </TD>
                      <TD align="right" className="whitespace-nowrap">
                        <div>{formatLkr(stats.gp)}</div>
                        <div className="text-[11px] text-zinc-500">
                          {formatPct(stats.margin)}
                        </div>
                      </TD>
                      <TD align="right">
                        <div className="flex justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" title="Actions">
                                <MoreHorizontal className="h-4 w-4" />
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
                              <DropdownMenuItem asChild disabled={inv.status === "CANCELLED"}>
                                <form action={voidInvoice} className="w-full">
                                  <input
                                    type="hidden"
                                    name="invoiceNo"
                                    value={inv.invoiceNo}
                                  />
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
                        </div>
                      </TD>
                    </tr>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-zinc-600">
          <div>
            Page {page} of {totalPages} • {invoiceCount} invoice
            {invoiceCount === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false}
                href={`/sales?${salesFilterQuery({
                  ...filterValues,
                  page: String(Math.max(1, page - 1)),
                })}`}
              >
                Previous
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link prefetch={false}
                href={`/sales?${salesFilterQuery({
                  ...filterValues,
                  page: String(Math.min(totalPages, page + 1)),
                })}`}
              >
                Next
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
