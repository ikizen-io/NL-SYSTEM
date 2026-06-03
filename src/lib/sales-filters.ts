import type { Prisma } from "@prisma/client";
import { invoiceFinancials } from "@/lib/invoices";
import type { PaymentMethodValue } from "@/lib/payment-methods";

export type SalesFilterParams = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  customer?: string;
  payMethod?: string;
  brand?: string;
  category?: string;
  page?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseSalesFilters(sp: SalesFilterParams) {
  return {
    q: (sp.q ?? "").trim(),
    from: sp.from && datePattern.test(sp.from) ? sp.from : "",
    to: sp.to && datePattern.test(sp.to) ? sp.to : "",
    status: sp.status ?? "all",
    customer: (sp.customer ?? "").trim(),
    payMethod: sp.payMethod ?? "all",
    brand: (sp.brand ?? "").trim(),
    category: (sp.category ?? "").trim(),
    page: Math.max(1, Number(sp.page ?? "1") || 1),
  };
}

export function buildSalesInvoiceWhere(
  filters: ReturnType<typeof parseSalesFilters>,
): Prisma.InvoiceWhereInput | undefined {
  const clauses: Prisma.InvoiceWhereInput[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        { invoiceNo: { contains: filters.q } },
        { customer: { name: { contains: filters.q } } },
      ],
    });
  }

  if (filters.from) {
    clauses.push({
      issuedDate: { gte: new Date(`${filters.from}T00:00:00.000Z`) },
    });
  }

  if (filters.to) {
    clauses.push({
      issuedDate: { lte: new Date(`${filters.to}T23:59:59.999Z`) },
    });
  }

  if (filters.customer) {
    clauses.push({ customer: { name: filters.customer } });
  }

  if (filters.payMethod !== "all") {
    clauses.push({
      payments: {
        some: { method: filters.payMethod as PaymentMethodValue },
      },
    });
  }

  if (filters.brand) {
    clauses.push({
      items: { some: { variant: { product: { brand: filters.brand } } } },
    });
  }

  if (filters.category) {
    clauses.push({
      items: { some: { variant: { product: { category: filters.category } } } },
    });
  }

  if (filters.status === "CANCELLED" || filters.status === "RETURNED") {
    clauses.push({ status: filters.status });
  } else if (filters.status === "ISSUED") {
    clauses.push({ status: "ISSUED" });
  } else if (filters.status === "paid" || filters.status === "pending") {
    clauses.push({ status: "ISSUED" });
  }

  if (clauses.length === 0) return undefined;
  return { AND: clauses };
}

export function filterInvoicesByDerivedStatus<T extends Parameters<typeof invoiceFinancials>[0]>(
  invoices: T[],
  status: string,
): T[] {
  if (status !== "paid" && status !== "pending") return invoices;
  return invoices.filter((invoice) => {
    const { derivedStatus } = invoiceFinancials(invoice);
    return status === "paid"
      ? derivedStatus === "COMPLETED"
      : derivedStatus === "PENDING";
  });
}

export function paginateInvoices<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    total,
    totalPages,
    page: safePage,
  };
}
