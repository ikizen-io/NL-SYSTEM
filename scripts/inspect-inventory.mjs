import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const counts = {
  invoices: await prisma.invoice.count(),
  invoiceItems: await prisma.invoiceItem.count(),
  payments: await prisma.payment.count(),
  variants: await prisma.variant.count(),
  products: await prisma.product.count(),
  stockIns: await prisma.stockIn.count(),
  adjustments: await prisma.stockAdjustment.count(),
  suppliers: await prisma.supplier.count(),
};

console.log(JSON.stringify(counts, null, 2));

await prisma.$disconnect();
