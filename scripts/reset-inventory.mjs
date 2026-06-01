import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const before = {
  stockIns: await prisma.stockIn.count(),
  adjustments: await prisma.stockAdjustment.count(),
  variants: await prisma.variant.count(),
  products: await prisma.product.count(),
  suppliers: await prisma.supplier.count(),
};

const blockingItems = await prisma.invoiceItem.count();
if (blockingItems > 0) {
  console.error(
    `Aborting: ${blockingItems} invoice items reference existing variants. Clear invoices first.`,
  );
  process.exit(1);
}

await prisma.$transaction([
  prisma.stockIn.deleteMany({}),
  prisma.stockAdjustment.deleteMany({}),
  prisma.variant.deleteMany({}),
  prisma.product.deleteMany({}),
]);

const after = {
  stockIns: await prisma.stockIn.count(),
  adjustments: await prisma.stockAdjustment.count(),
  variants: await prisma.variant.count(),
  products: await prisma.product.count(),
  suppliers: await prisma.supplier.count(),
};

console.log("Before:", JSON.stringify(before));
console.log("After:", JSON.stringify(after));

await prisma.$disconnect();
