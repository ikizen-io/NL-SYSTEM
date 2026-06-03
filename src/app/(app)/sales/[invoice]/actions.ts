"use server";

import { prisma } from "@/lib/prisma";
import { effectiveUnitCost } from "@/lib/costing";
import { invoiceFinancials, invoiceFinancialsFromRecord } from "@/lib/invoices";
import { toReturnRecordInput } from "@/lib/invoice-queries";
import { paymentMethodValues } from "@/lib/payment-methods";
import {
  availableReturnQty,
  type ReturnRecordInput,
} from "@/lib/returns";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type PaymentActionState = {
  ok?: boolean;
  error?: string;
};

export type InvoiceActionState = {
  ok?: boolean;
  error?: string;
};

export type ReturnActionState = {
  ok?: boolean;
  error?: string;
};

const paymentMethods = paymentMethodValues;

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value == null ? "" : value),
    z.string().max(max).optional().or(z.literal("")),
  );

const optionalMoney = (schema: z.ZodType<number>) =>
  z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    schema.optional(),
  );

const invoiceItemSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1).max(50),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
});

const updateInvoiceSchema = z.object({
  invoiceNo: z.string().min(1),
  date: z.string().min(1),
  customerName: z.string().min(1).max(80),
  customerPhone: optionalText(40),
  customerInstagram: optionalText(60),
  customerAddress: optionalText(240),
  shippingCharge: optionalMoney(z.coerce.number().int().nonnegative()),
  discountAmount: optionalMoney(z.coerce.number().int().nonnegative()),
  preferredPaymentMethod: z.enum(paymentMethods),
  items: z.array(invoiceItemSchema).min(1),
  notes: optionalText(500),
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

const paymentIdSchema = z.object({
  invoiceNo: z.string().min(1),
  paymentId: z.string().min(1),
});

const addPaymentSchema = z.object({
  invoiceNo: z.string().min(1),
  date: z.string().min(1),
  method: z.enum(paymentMethods),
  amount: z.coerce.number().int().positive(),
  reference: z.string().max(80).optional().or(z.literal("")),
});

const updatePaymentSchema = addPaymentSchema.extend({
  paymentId: z.string().min(1),
});

function invoiceLookup(invoiceNo: string) {
  const invoiceParam = invoiceNo.replace("#", "");
  return {
    invoiceParam,
    where: {
      OR: [{ invoiceNo: invoiceParam }, { invoiceNo: `#${invoiceParam}` }],
    },
  };
}

function currentStockForVariant(variant: {
  stockIns: { qty: number }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
}) {
  const received = variant.stockIns.reduce((sum, stock) => sum + stock.qty, 0);
  const adjusted = variant.adjustments.reduce((sum, adj) => sum + adj.qtyDelta, 0);
  const sold = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  return received + adjusted - sold;
}

function invoiceNetTotal(invoice: {
  status: string;
  shippingCharge: number;
  discountAmount: number;
  items: { id: string; qty: number; unitPrice: number; unitCostAtSale: number }[];
  payments?: { amount: number }[];
  returnRecords: ReturnRecordInput[];
}) {
  return invoiceFinancialsFromRecord({
    status: invoice.status,
    shippingCharge: invoice.shippingCharge,
    discountAmount: invoice.discountAmount,
    items: invoice.items,
    payments: invoice.payments ?? [],
    returnRecords: invoice.returnRecords,
  }).revenue;
}

function revalidateInvoicePaths(invoiceParam: string) {
  revalidatePath(`/sales/${encodeURIComponent(invoiceParam)}`);
  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  revalidatePath("/reports");
  revalidatePath("/customers");
}

export async function addPayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = addPaymentSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    date: formData.get("date"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) return { error: "Please enter a valid payment." };

  const v = parsed.data;
  const { invoiceParam, where } = invoiceLookup(v.invoiceNo);
  const invoice = await prisma.invoice.findFirst({
    where,
    include: {
      items: true,
      payments: true,
      returnRecords: { include: { items: true } },
    },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "ISSUED") {
    return { error: "Payments can only be added to issued invoices." };
  }

  const returnRecords = toReturnRecordInput(invoice.returnRecords);
  const total = invoiceNetTotal({ ...invoice, returnRecords });
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = total - paid;

  if (v.amount > balance) {
    return { error: `Payment exceeds remaining balance (${balance} LKR).` };
  }

  await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      date: new Date(v.date),
      method: v.method as PaymentMethod,
      amount: v.amount,
      reference: v.reference?.trim() || null,
    },
  });

  revalidateInvoicePaths(invoiceParam);
  return { ok: true };
}

const statusSchema = z.object({
  invoiceNo: z.string().min(1),
  status: z.enum(["ISSUED", "CANCELLED", "RETURNED"]),
});

export async function setInvoiceStatus(
  _prevState: ReturnActionState,
  formData: FormData,
): Promise<ReturnActionState> {
  const parsed = statusSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: "Invalid status input." };

  const { invoiceParam, where } = invoiceLookup(parsed.data.invoiceNo);

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where,
        include: {
          items: { include: { variant: true } },
          returnRecords: { include: { items: true } },
        },
      });
      if (!invoice) throw new Error("Invoice not found.");

      if (invoice.status === "RETURNED" && parsed.data.status === "ISSUED") {
        throw new Error(
          "Returned invoices cannot be re-issued from here. Create a new sale instead.",
        );
      }

      if (parsed.data.status === "RETURNED" && invoice.status === "ISSUED") {
        const returnRecords = toReturnRecordInput(invoice.returnRecords);
        const lines = invoice.items.flatMap((item) => {
          const qty = availableReturnQty(item.id, item.qty, returnRecords);
          if (qty <= 0) return [];
          return [{ invoiceItemId: item.id, qty, restock: true }];
        });

        if (lines.length > 0) {
          const returnRecord = await tx.returnRecord.create({
            data: {
              invoiceId: invoice.id,
              date: new Date(),
              notes: "Full invoice marked as returned",
              items: { create: lines },
            },
            include: { items: true },
          });

          for (const returnItem of returnRecord.items) {
            const invoiceItem = invoice.items.find(
              (item) => item.id === returnItem.invoiceItemId,
            );
            if (!invoiceItem || !returnItem.restock) continue;
            await tx.stockAdjustment.create({
              data: {
                variantId: invoiceItem.variantId,
                qtyDelta: returnItem.qty,
                reason: "Customer return",
                notes: `Full return on ${invoice.invoiceNo}`,
              },
            });
          }
        }
      }

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: parsed.data.status },
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update invoice status.",
    };
  }

  revalidateInvoicePaths(invoiceParam);
  return { ok: true };
}

export async function voidInvoice(formData: FormData) {
  const parsed = statusSchema.pick({ invoiceNo: true }).safeParse({
    invoiceNo: formData.get("invoiceNo"),
  });
  if (!parsed.success) throw new Error("Invalid invoice");

  const { invoiceParam, where } = invoiceLookup(parsed.data.invoiceNo);
  const invoice = await prisma.invoice.findFirst({ where, select: { id: true } });
  if (!invoice) throw new Error("Invoice not found");

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "CANCELLED" },
  });

  revalidateInvoicePaths(invoiceParam);
}

export async function updateInvoice(
  _prevState: InvoiceActionState,
  formData: FormData,
): Promise<InvoiceActionState> {
  const rawItems = formData.get("items");
  let items: unknown = [];
  if (typeof rawItems === "string") {
    try {
      items = JSON.parse(rawItems);
    } catch {
      items = [];
    }
  }

  const parsed = updateInvoiceSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    date: formData.get("date"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerInstagram: formData.get("customerInstagram"),
    customerAddress: formData.get("customerAddress"),
    shippingCharge: formData.get("shippingCharge"),
    discountAmount: formData.get("discountAmount"),
    preferredPaymentMethod: formData.get("preferredPaymentMethod"),
    notes: formData.get("notes"),
    items,
  });
  if (!parsed.success) {
    return { error: "Please complete the invoice before saving." };
  }

  const v = parsed.data;
  const { invoiceParam, where } = invoiceLookup(v.invoiceNo);
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
  if (discountAmount > itemsTotal + shippingCharge) {
    return { error: "Discount cannot exceed the item total plus shipping." };
  }
  const newTotal = itemsTotal + shippingCharge - discountAmount;

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where,
        include: {
          items: { include: { variant: true } },
          payments: true,
          returnRecords: { include: { items: true } },
        },
      });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.status === "CANCELLED") {
        throw new Error("Voided invoices cannot be edited. Restore to issued first.");
      }
      if (invoice.status === "RETURNED") {
        throw new Error("Returned invoices cannot be edited.");
      }
      if (invoice.returnRecords.length > 0) {
        throw new Error(
          "Invoices with returns cannot be rewritten here. Use the Returns tab for exchanges.",
        );
      }

      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (paid > newTotal) {
        throw new Error(
          "Payments already collected exceed the new total. Adjust payments first.",
        );
      }

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

      const skus = [...new Set(v.items.map((item) => item.sku.trim()))];
      const variants = await tx.variant.findMany({
        where: { sku: { in: skus }, active: true },
        include: {
          stockIns: true,
          adjustments: true,
          invoiceItems: { include: { invoice: { select: { status: true } } } },
        },
      });
      const bySku = new Map(variants.map((variant) => [variant.sku, variant]));
      for (const sku of skus) {
        if (!bySku.get(sku)) throw new Error(`Unknown or archived SKU: ${sku}`);
      }

      const currentIssuedQty = new Map<string, number>();
      if (invoice.status === "ISSUED") {
        for (const item of invoice.items) {
          currentIssuedQty.set(
            item.variant.sku,
            (currentIssuedQty.get(item.variant.sku) ?? 0) + item.qty,
          );
        }
      }

      const requestedQty = new Map<string, number>();
      for (const item of v.items) {
        const sku = item.sku.trim();
        requestedQty.set(sku, (requestedQty.get(sku) ?? 0) + item.qty);
      }

      for (const [sku, requested] of requestedQty) {
        const variant = bySku.get(sku)!;
        const alreadyIssued = currentIssuedQty.get(sku) ?? 0;
        const available = Math.max(
          currentStockForVariant(variant) + alreadyIssued,
          alreadyIssued,
        );
        if (requested > available) {
          throw new Error(
            `${sku} has only ${available} available. Requested ${requested}.`,
          );
        }
      }

      const existingById = new Map(invoice.items.map((item) => [item.id, item]));
      const itemCreates = v.items.map((item) => {
        const variant = bySku.get(item.sku.trim())!;
        const existing = item.id ? existingById.get(item.id) : null;
        const latestStockIn =
          variant.stockIns.length === 0
            ? null
            : [...variant.stockIns].sort(
                (a, b) => b.receivedDate.getTime() - a.receivedDate.getTime(),
              )[0]!;

        return {
          variantId: variant.id,
          qty: item.qty,
          unitPrice: item.unitPrice,
          unitCostAtSale:
            existing && existing.variantId === variant.id
              ? existing.unitCostAtSale
              : latestStockIn
                ? effectiveUnitCost({
                    qty: latestStockIn.qty,
                    unitCost: latestStockIn.unitCost,
                    extraCost: latestStockIn.extraCost ?? null,
                  })
                : 0,
        };
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          issuedDate,
          customerId: customer.id,
          shippingCharge,
          discountAmount,
          preferredPaymentMethod: v.preferredPaymentMethod as PaymentMethod,
          notes: v.notes?.trim() || null,
          items: {
            deleteMany: {},
            create: itemCreates,
          },
        },
      });
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update invoice. Please check the details.",
    };
  }

  revalidateInvoicePaths(invoiceParam);
  return { ok: true };
}

export async function updatePayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = updatePaymentSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    paymentId: formData.get("paymentId"),
    date: formData.get("date"),
    method: formData.get("method"),
    amount: formData.get("amount"),
    reference: formData.get("reference"),
  });
  if (!parsed.success) return { error: "Please enter valid payment details." };

  const v = parsed.data;
  const { invoiceParam, where } = invoiceLookup(v.invoiceNo);
  const invoice = await prisma.invoice.findFirst({
    where,
    include: {
      items: true,
      payments: true,
      returnRecords: { include: { items: true } },
    },
  });
  if (!invoice) return { error: "Invoice not found." };
  if (invoice.status !== "ISSUED") {
    return { error: "Payments can only be edited on issued invoices." };
  }

  const returnRecords = toReturnRecordInput(invoice.returnRecords);
  const total = invoiceNetTotal({ ...invoice, returnRecords });
  const paidExcludingCurrent = invoice.payments.reduce(
    (sum, payment) => sum + (payment.id === v.paymentId ? 0 : payment.amount),
    0,
  );
  if (paidExcludingCurrent + v.amount > total) {
    return { error: "Payment total cannot exceed invoice total." };
  }

  await prisma.payment.update({
    where: { id: v.paymentId },
    data: {
      date: new Date(v.date),
      method: v.method as PaymentMethod,
      amount: v.amount,
      reference: v.reference?.trim() || null,
    },
  });

  revalidateInvoicePaths(invoiceParam);
  return { ok: true };
}

export async function deletePayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = paymentIdSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    paymentId: formData.get("paymentId"),
  });
  if (!parsed.success) {
    return { error: "Invalid payment." };
  }

  try {
    const { invoiceParam } = invoiceLookup(parsed.data.invoiceNo);
    await prisma.payment.delete({ where: { id: parsed.data.paymentId } });
    revalidateInvoicePaths(invoiceParam);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not delete payment. Please try again.",
    };
  }

  return { ok: true };
}

const returnLineSchema = z.object({
  invoiceItemId: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  restock: z.boolean(),
});

const exchangeLineSchema = z.object({
  sku: z.string().min(1).max(50),
  qty: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().int().nonnegative(),
});

const processReturnSchema = z.object({
  invoiceNo: z.string().min(1),
  date: z.string().min(1),
  notes: optionalText(500),
  returns: z.array(returnLineSchema).min(1),
  exchanges: z.array(exchangeLineSchema).default([]),
  refundAmount: z.coerce.number().int().nonnegative().optional(),
  refundMethod: z.enum(paymentMethods).optional(),
  refundReference: optionalText(80),
});

export async function processReturn(
  _prevState: ReturnActionState,
  formData: FormData,
): Promise<ReturnActionState> {
  const rawReturns = formData.get("returns");
  const rawExchanges = formData.get("exchanges");
  let returns: unknown = [];
  let exchanges: unknown = [];
  if (typeof rawReturns === "string") {
    try {
      returns = JSON.parse(rawReturns);
    } catch {
      returns = [];
    }
  }
  if (typeof rawExchanges === "string") {
    try {
      exchanges = JSON.parse(rawExchanges);
    } catch {
      exchanges = [];
    }
  }

  const parsed = processReturnSchema.safeParse({
    invoiceNo: formData.get("invoiceNo"),
    date: formData.get("date"),
    notes: formData.get("notes"),
    returns,
    exchanges,
    refundAmount: formData.get("refundAmount"),
    refundMethod: formData.get("refundMethod"),
    refundReference: formData.get("refundReference"),
  });
  if (!parsed.success) {
    return { error: "Please complete the return details before saving." };
  }

  const v = parsed.data;
  const refundAmount = Number.isFinite(v.refundAmount as number)
    ? Number(v.refundAmount)
    : 0;
  const { invoiceParam, where } = invoiceLookup(v.invoiceNo);

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where,
        include: {
          items: { include: { variant: true } },
          payments: true,
          returnRecords: { include: { items: true } },
        },
      });
      if (!invoice) throw new Error("Invoice not found.");
      if (invoice.status !== "ISSUED") {
        throw new Error("Returns can only be processed on issued invoices.");
      }

      const returnRecords = toReturnRecordInput(invoice.returnRecords);
      const itemById = new Map(invoice.items.map((item) => [item.id, item]));

      for (const line of v.returns) {
        const item = itemById.get(line.invoiceItemId);
        if (!item) throw new Error("Return line does not match this invoice.");
        const available = availableReturnQty(
          line.invoiceItemId,
          item.qty,
          returnRecords,
        );
        if (line.qty > available) {
          throw new Error(
            `${item.variant.sku}: only ${available} can still be returned.`,
          );
        }
      }

      const exchangeSkus = [...new Set(v.exchanges.map((line) => line.sku.trim()))];
      const exchangeVariants =
        exchangeSkus.length === 0
          ? []
          : await tx.variant.findMany({
              where: { sku: { in: exchangeSkus }, active: true },
              include: {
                stockIns: true,
                adjustments: true,
                invoiceItems: {
                  include: { invoice: { select: { status: true } } },
                },
              },
            });
      const bySku = new Map(exchangeVariants.map((variant) => [variant.sku, variant]));
      for (const sku of exchangeSkus) {
        if (!bySku.get(sku)) throw new Error(`Unknown or archived SKU: ${sku}`);
      }

      const exchangeQty = new Map<string, number>();
      for (const line of v.exchanges) {
        const sku = line.sku.trim();
        exchangeQty.set(sku, (exchangeQty.get(sku) ?? 0) + line.qty);
      }
      for (const [sku, requested] of exchangeQty) {
        const variant = bySku.get(sku)!;
        if (requested > currentStockForVariant(variant)) {
          throw new Error(
            `${sku} has only ${currentStockForVariant(variant)} in stock for exchange.`,
          );
        }
      }

      if (refundAmount > 0 && !v.refundMethod) {
        throw new Error("Select a refund method when recording a refund amount.");
      }

      const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (refundAmount > paid) {
        throw new Error("Refund cannot exceed total payments on this invoice.");
      }

      const returnRecord = await tx.returnRecord.create({
        data: {
          invoiceId: invoice.id,
          date: new Date(v.date),
          notes: v.notes?.trim() || null,
          refundAmount,
          refundMethod:
            refundAmount > 0 && v.refundMethod
              ? (v.refundMethod as PaymentMethod)
              : null,
          refundReference:
            refundAmount > 0 ? v.refundReference?.trim() || null : null,
          items: {
            create: v.returns.map((line) => ({
              invoiceItemId: line.invoiceItemId,
              qty: line.qty,
              restock: line.restock,
            })),
          },
        },
        include: { items: true },
      });

      for (const returnItem of returnRecord.items) {
        const invoiceItem = itemById.get(returnItem.invoiceItemId);
        if (!invoiceItem || !returnItem.restock) continue;
        await tx.stockAdjustment.create({
          data: {
            variantId: invoiceItem.variantId,
            qtyDelta: returnItem.qty,
            reason: "Customer return",
            notes: `Return on ${invoice.invoiceNo}`,
          },
        });
      }

      for (const line of v.exchanges) {
        const variant = bySku.get(line.sku.trim())!;
        const latestStockIn =
          variant.stockIns.length === 0
            ? null
            : [...variant.stockIns].sort(
                (a, b) => b.receivedDate.getTime() - a.receivedDate.getTime(),
              )[0]!;
        const unitCostAtSale = latestStockIn
          ? effectiveUnitCost({
              qty: latestStockIn.qty,
              unitCost: latestStockIn.unitCost,
              extraCost: latestStockIn.extraCost ?? null,
            })
          : 0;

        const newItem = await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            variantId: variant.id,
            qty: line.qty,
            unitPrice: line.unitPrice,
            unitCostAtSale,
          },
        });

        await tx.exchangeItem.create({
          data: {
            returnId: returnRecord.id,
            invoiceItemId: newItem.id,
            variantId: variant.id,
            qty: line.qty,
            unitPrice: line.unitPrice,
            unitCostAtSale,
          },
        });
      }

      const [allItems, allReturnRecords] = await Promise.all([
        tx.invoiceItem.findMany({ where: { invoiceId: invoice.id } }),
        tx.returnRecord.findMany({
          where: { invoiceId: invoice.id },
          include: { items: true },
        }),
      ]);

      const projectedRevenue = invoiceFinancials({
        status: invoice.status,
        shippingCharge: invoice.shippingCharge,
        discountAmount: invoice.discountAmount,
        items: allItems,
        returnRecords: toReturnRecordInput(allReturnRecords),
      }).revenue;

      if (paid > projectedRevenue) {
        throw new Error(
          "Payments already collected exceed the invoice total after this return/exchange. Record a refund or adjust payments first.",
        );
      }
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not process return. Please check the details.",
    };
  }

  revalidateInvoicePaths(invoiceParam);
  return { ok: true };
}

