"use server";

import { prisma } from "@/lib/prisma";
import { formatInvoiceNo, invoiceYearKey } from "@/lib/format";
import { effectiveUnitCost } from "@/lib/costing";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type SaleActionState = {
  ok?: boolean;
  error?: string;
};

const saleItemSchema = z.object({
  sku: z.string().min(1).max(50),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().positive(),
});

const optionalMoney = (schema: z.ZodType<number>) =>
  z.preprocess((value) => (value === "" || value == null ? undefined : value), schema.optional());

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value == null ? "" : value),
    z.string().max(max).optional().or(z.literal("")),
  );

const saleSchema = z.object({
  date: z.string().min(1),
  customerName: z.string().min(1).max(80),
  customerPhone: optionalText(40),
  customerInstagram: optionalText(60),
  customerAddress: optionalText(240),
  items: z.array(saleItemSchema).min(1),
  shippingCharge: optionalMoney(z.coerce.number().int().nonnegative()),
  discountAmount: optionalMoney(z.coerce.number().int().nonnegative()),
  paymentMethod: z.enum(["BANK", "CASH", "COD", "TRANSFER", "OTHER"]).optional(),
  paymentAmount: optionalMoney(z.coerce.number().int().positive()),
});

function customerWriteFields(input: {
  phone?: string;
  instagramHandle?: string;
  address?: string;
}) {
  const update: Record<string, string | null> = {};
  const create: Record<string, string> = {};
  if (input.phone !== undefined) {
    const v = input.phone.trim();
    update.phone = v || null;
    if (v) create.phone = v;
  }
  if (input.instagramHandle !== undefined) {
    const v = input.instagramHandle.trim();
    update.instagramHandle = v || null;
    if (v) create.instagramHandle = v;
  }
  if (input.address !== undefined) {
    const v = input.address.trim();
    update.address = v || null;
    if (v) create.address = v;
  }
  return { update, create };
}

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

export async function createSale(
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  const rawItems = formData.get("items");
  let items: unknown = [];
  if (typeof rawItems === "string") {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  const parsed = saleSchema.safeParse({
    date: formData.get("date"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerInstagram: formData.get("customerInstagram"),
    customerAddress: formData.get("customerAddress"),
    items,
    shippingCharge: formData.get("shippingCharge"),
    discountAmount: formData.get("discountAmount"),
    paymentMethod: formData.get("paymentMethod"),
    paymentAmount: formData.get("paymentAmount"),
  });

  if (!parsed.success) {
    return { error: "Please complete the sale details before creating the invoice." };
  }

  const v = parsed.data;
  const issuedDate = new Date(v.date);
  const shippingCharge = Number.isFinite(v.shippingCharge as number)
    ? Number(v.shippingCharge)
    : 0;
  const discountAmount = Number.isFinite(v.discountAmount as number)
    ? Number(v.discountAmount)
    : 0;
  const itemsTotal = v.items.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0,
  );
  const subtotal = itemsTotal + shippingCharge;
  if (discountAmount > subtotal) {
    return { error: "Discount cannot exceed the item total plus shipping." };
  }
  const invoiceTotal = subtotal - discountAmount;

  if (
    Number.isFinite(v.paymentAmount as number) &&
    Number(v.paymentAmount) > invoiceTotal
  ) {
    return { error: "Payment amount cannot exceed the invoice total." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const yearKey = invoiceYearKey(issuedDate);
      const counterKey = `invoice:${yearKey}`;
      const latestYearInvoice = await tx.invoice.findFirst({
        where: { invoiceNo: { startsWith: yearKey } },
        orderBy: { invoiceNo: "desc" },
        select: { invoiceNo: true },
      });
      const latestYearOrder = latestYearInvoice
        ? Number.parseInt(latestYearInvoice.invoiceNo.slice(2), 10) || 0
        : 0;
      const counter = await tx.counter.upsert({
        where: { key: counterKey },
        update: { value: { increment: 1 } },
        create: { key: counterKey, value: latestYearOrder + 1 },
        select: { value: true },
      });

      const invoiceNo = formatInvoiceNo(issuedDate, counter.value);

      const customerFields = customerWriteFields({
        phone: v.customerPhone,
        instagramHandle: v.customerInstagram,
        address: v.customerAddress,
      });
      const customer = await tx.customer.upsert({
        where: { name: v.customerName.trim() },
        update: customerFields.update,
        create: { name: v.customerName.trim(), ...customerFields.create },
      });

      const skus = v.items.map((i) => i.sku.trim());
      const variants = await tx.variant.findMany({
        where: { sku: { in: skus }, active: true },
        include: {
          stockIns: true,
          adjustments: true,
          invoiceItems: { include: { invoice: { select: { status: true } } } },
        },
      });
      const bySku = new Map(variants.map((vv) => [vv.sku, vv]));
      for (const sku of skus) {
        if (!bySku.get(sku)) throw new Error(`Unknown or archived SKU: ${sku}`);
      }

      const requestedBySku = new Map<string, number>();
      for (const item of v.items) {
        const sku = item.sku.trim();
        requestedBySku.set(sku, (requestedBySku.get(sku) ?? 0) + item.qty);
      }

      for (const [sku, requested] of requestedBySku) {
        const variant = bySku.get(sku)!;
        const available = availableStock(variant);
        if (requested > available) {
          throw new Error(
            `${sku} has only ${available} in stock. Requested ${requested}.`,
          );
        }
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo,
          issuedDate,
          status: "ISSUED",
          shippingCharge,
          discountAmount,
          customerId: customer.id,
          items: {
            create: v.items.map((it) => {
              const variant = bySku.get(it.sku.trim())!;
              const latestStockIn =
                variant.stockIns.length === 0
                  ? null
                  : [...variant.stockIns].sort(
                      (a, b) => b.receivedDate.getTime() - a.receivedDate.getTime(),
                    )[0]!;
              return {
                variantId: variant.id,
                qty: it.qty,
                unitPrice: it.unitPrice,
                unitCostAtSale: latestStockIn
                  ? effectiveUnitCost({
                      qty: latestStockIn.qty,
                      unitCost: latestStockIn.unitCost,
                      extraCost: latestStockIn.extraCost ?? null,
                    })
                  : 0,
              };
            }),
          },
        },
        select: { id: true },
      });

      if (
        v.paymentMethod &&
        Number.isFinite(v.paymentAmount as number) &&
        Number(v.paymentAmount) > 0
      ) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            date: issuedDate,
            method: v.paymentMethod as PaymentMethod,
            amount: Number(v.paymentAmount),
          },
        });
      }
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create invoice. Please check the sale details.",
    };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  revalidatePath("/inventory");
  return { ok: true };
}

