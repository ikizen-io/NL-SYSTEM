import { prisma } from "@/lib/prisma";
import { csvFilename, toCsv } from "@/lib/csv";
import { invoiceStatsFromRecord } from "@/lib/invoice-queries";
import { computeInventoryRow } from "@/lib/inventory";

export const exportDatasets = [
  "variants",
  "stock-ins",
  "invoices",
  "invoice-items",
  "payments",
  "expenses",
  "customers",
] as const;

export type ExportDataset = (typeof exportDatasets)[number];

export function isExportDataset(value: string): value is ExportDataset {
  return (exportDatasets as readonly string[]).includes(value);
}

export async function buildExportCsv(dataset: ExportDataset) {
  switch (dataset) {
    case "variants": {
      const variants = await prisma.variant.findMany({
        include: { product: true, stockIns: true, adjustments: true, invoiceItems: { include: { invoice: { select: { status: true } } } } },
        orderBy: { sku: "asc" },
      });
      const headers = [
        "sku",
        "brand",
        "category",
        "modelName",
        "sizeLabel",
        "color",
        "targetPrice",
        "active",
        "currentStock",
        "unitCost",
      ];
      const rows = variants.map((variant) => {
        const row = computeInventoryRow(variant);
        return {
          sku: row.sku,
          brand: row.brand,
          category: row.category,
          modelName: row.modelName,
          sizeLabel: row.sizeLabel,
          color: row.color ?? "",
          targetPrice: row.targetPrice ?? "",
          active: row.active ? "yes" : "no",
          currentStock: row.currentStock,
          unitCost: row.unitCost,
        };
      });
      return { filename: csvFilename("variants"), content: toCsv(headers, rows) };
    }

    case "stock-ins": {
      const stockIns = await prisma.stockIn.findMany({
        include: {
          variant: { include: { product: true } },
          supplierRecord: true,
        },
        orderBy: { receivedDate: "desc" },
      });
      const headers = [
        "receivedDate",
        "sku",
        "brand",
        "modelName",
        "sizeLabel",
        "supplier",
        "qty",
        "unitCost",
        "extraCost",
        "purchaseRef",
        "notes",
      ];
      const rows = stockIns.map((stockIn) => ({
        receivedDate: stockIn.receivedDate.toISOString().slice(0, 10),
        sku: stockIn.variant.sku,
        brand: stockIn.variant.product.brand,
        modelName: stockIn.variant.product.modelName,
        sizeLabel: stockIn.variant.sizeLabel,
        supplier: stockIn.supplierRecord?.name ?? stockIn.supplier ?? "",
        qty: stockIn.qty,
        unitCost: stockIn.unitCost,
        extraCost: stockIn.extraCost ?? "",
        purchaseRef: stockIn.purchaseRef ?? "",
        notes: stockIn.notes ?? "",
      }));
      return { filename: csvFilename("stock-ins"), content: toCsv(headers, rows) };
    }

    case "invoices": {
      const invoices = await prisma.invoice.findMany({
        include: {
          customer: true,
          items: true,
          payments: true,
          returnRecords: { include: { items: true } },
        },
        orderBy: { issuedDate: "desc" },
      });
      const headers = [
        "invoiceNo",
        "issuedDate",
        "status",
        "customerName",
        "preferredPaymentMethod",
        "shippingCharge",
        "discountAmount",
        "itemsTotal",
        "grandTotal",
        "paidTotal",
        "refundedTotal",
        "balance",
        "notes",
      ];
      const rows = invoices.map((invoice) => {
        const stats = invoiceStatsFromRecord(invoice);
        const itemsTotal = stats.revenue - invoice.shippingCharge + invoice.discountAmount;
        return {
          invoiceNo: invoice.invoiceNo,
          issuedDate: invoice.issuedDate.toISOString().slice(0, 10),
          status: invoice.status,
          customerName: invoice.customer?.name ?? "",
          preferredPaymentMethod: invoice.preferredPaymentMethod ?? "",
          shippingCharge: invoice.shippingCharge,
          discountAmount: invoice.discountAmount,
          itemsTotal,
          grandTotal: stats.revenue,
          paidTotal: stats.paid,
          refundedTotal: stats.refunded,
          balance: stats.balance,
          notes: invoice.notes ?? "",
        };
      });
      return { filename: csvFilename("invoices"), content: toCsv(headers, rows) };
    }

    case "invoice-items": {
      const items = await prisma.invoiceItem.findMany({
        include: {
          invoice: { select: { invoiceNo: true, issuedDate: true, status: true } },
          variant: { include: { product: true } },
        },
        orderBy: [{ invoice: { issuedDate: "desc" } }, { createdAt: "asc" }],
      });
      const headers = [
        "invoiceNo",
        "issuedDate",
        "invoiceStatus",
        "sku",
        "brand",
        "modelName",
        "sizeLabel",
        "qty",
        "unitPrice",
        "unitCostAtSale",
        "lineTotal",
      ];
      const rows = items.map((item) => ({
        invoiceNo: item.invoice.invoiceNo,
        issuedDate: item.invoice.issuedDate.toISOString().slice(0, 10),
        invoiceStatus: item.invoice.status,
        sku: item.variant.sku,
        brand: item.variant.product.brand,
        modelName: item.variant.product.modelName,
        sizeLabel: item.variant.sizeLabel,
        qty: item.qty,
        unitPrice: item.unitPrice,
        unitCostAtSale: item.unitCostAtSale,
        lineTotal: item.qty * item.unitPrice,
      }));
      return {
        filename: csvFilename("invoice-items"),
        content: toCsv(headers, rows),
      };
    }

    case "payments": {
      const payments = await prisma.payment.findMany({
        include: { invoice: { select: { invoiceNo: true } } },
        orderBy: { date: "desc" },
      });
      const headers = ["invoiceNo", "date", "method", "amount", "reference"];
      const rows = payments.map((payment) => ({
        invoiceNo: payment.invoice.invoiceNo,
        date: payment.date.toISOString().slice(0, 10),
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference ?? "",
      }));
      return { filename: csvFilename("payments"), content: toCsv(headers, rows) };
    }

    case "expenses": {
      const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });
      const headers = [
        "date",
        "category",
        "description",
        "amount",
        "paymentMethod",
        "notes",
      ];
      const rows = expenses.map((expense) => ({
        date: expense.date.toISOString().slice(0, 10),
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes ?? "",
      }));
      return { filename: csvFilename("expenses"), content: toCsv(headers, rows) };
    }

    case "customers": {
      const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
      const headers = [
        "name",
        "phone",
        "instagramHandle",
        "address",
        "notes",
      ];
      const rows = customers.map((customer) => ({
        name: customer.name,
        phone: customer.phone ?? "",
        instagramHandle: customer.instagramHandle ?? "",
        address: customer.address ?? "",
        notes: customer.notes ?? "",
      }));
      return { filename: csvFilename("customers"), content: toCsv(headers, rows) };
    }

    default:
      throw new Error("Unknown export dataset.");
  }
}
