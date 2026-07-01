import { prisma } from "@/lib/prisma";
import { customerSlug } from "@/lib/invoices";

const RESULT_LIMIT = 6;

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type GlobalSearchResults = {
  customers: SearchResult[];
  invoices: SearchResult[];
  skus: SearchResult[];
};

export async function runGlobalSearch(rawQuery: string): Promise<GlobalSearchResults> {
  const query = rawQuery.trim();
  if (!query) {
    return { customers: [], invoices: [], skus: [] };
  }

  const [customers, invoices, variants] = await Promise.all([
    prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, phone: true },
      take: RESULT_LIMIT,
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { invoiceNo: { contains: query, mode: "insensitive" } },
          { customer: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        invoiceNo: true,
        issuedDate: true,
        status: true,
        customer: { select: { name: true } },
      },
      take: RESULT_LIMIT,
      orderBy: { issuedDate: "desc" },
    }),
    prisma.variant.findMany({
      where: {
        OR: [
          { sku: { contains: query, mode: "insensitive" } },
          { sizeLabel: { contains: query, mode: "insensitive" } },
          { color: { contains: query, mode: "insensitive" } },
          { product: { brand: { contains: query, mode: "insensitive" } } },
          { product: { modelName: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        sku: true,
        sizeLabel: true,
        color: true,
        active: true,
        product: { select: { brand: true, modelName: true } },
      },
      take: RESULT_LIMIT,
      orderBy: { sku: "asc" },
    }),
  ]);

  return {
    customers: customers.map((c) => ({
      id: c.id,
      title: c.name,
      subtitle: c.phone ?? "Customer",
      href: `/customers/${customerSlug(c.name)}`,
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      title: inv.invoiceNo,
      subtitle: [inv.customer?.name, inv.issuedDate.toISOString().slice(0, 10)]
        .filter(Boolean)
        .join(" · "),
      href: `/sales/${encodeURIComponent(inv.invoiceNo.replace("#", ""))}`,
    })),
    skus: variants.map((v) => ({
      id: v.id,
      title: v.sku,
      subtitle: [
        v.product.brand,
        v.product.modelName,
        v.sizeLabel,
        v.color,
        v.active ? null : "(archived)",
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/inventory/${encodeURIComponent(v.sku)}/edit`,
    })),
  };
}
