import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const models = [
  ["Product", prisma.product],
  ["Variant", prisma.variant],
  ["Customer", prisma.customer],
  ["Invoice", prisma.invoice],
  ["InvoiceItem", prisma.invoiceItem],
  ["Payment", prisma.payment],
  ["StockIn", prisma.stockIn],
  ["Supplier", prisma.supplier],
  ["Expense", prisma.expense],
  ["StockAdjustment", prisma.stockAdjustment],
  ["ReturnRecord", prisma.returnRecord],
  ["ReturnItem", prisma.returnItem],
  ["ExchangeItem", prisma.exchangeItem],
  ["Counter", prisma.counter],
];

try {
  for (const [name, model] of models) {
    console.log(`${name}: ${await model.count()}`);
  }
} finally {
  await prisma.$disconnect();
}
