"use server";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { paymentMethodValues } from "@/lib/payment-methods";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ImportActionState = {
  ok?: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  skipReasons?: string[];
};

const MAX_SKIP_REASONS = 5;

function describeIssues(rowNumber: number, error: z.ZodError) {
  const first = error.issues[0];
  const field = first?.path.join(".") || "value";
  const message = first?.message ?? "invalid value";
  return `Row ${rowNumber}: ${field} - ${message}`;
}

const inventoryRowSchema = z.object({
  sku: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  modelName: z.string().min(1),
  sizeLabel: z.string().min(1),
  unitCost: z.coerce.number().int().nonnegative(),
  targetPrice: z.coerce.number().int().nonnegative().optional().or(z.nan()),
  openingQty: z.coerce.number().int().nonnegative(),
});

const expenseRowSchema = z.object({
  date: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  paymentMethod: z.enum(paymentMethodValues),
  notes: z.string().optional().or(z.literal("")),
});

async function parseCsv(file: File) {
  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    throw new Error(parsed.errors[0]?.message ?? "CSV parse error");
  }
  return parsed.data;
}

export async function importInventory(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a CSV file." };
  }

  let rows: Record<string, string>[];
  try {
    rows = await parseCsv(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to parse CSV." };
  }

  if (rows.length === 0) return { error: "CSV is empty or has no valid rows." };

  let imported = 0;
  const skipReasons: string[] = [];
  let skipped = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!;
        const rowNumber = i + 2; // account for the header row
        const parsed = inventoryRowSchema.safeParse({
          sku: r.sku ?? r.SKU,
          brand: r.brand ?? r.Brand,
          category: r.category ?? r.Category,
          modelName: r.modelName ?? r["Product Model"] ?? r.productModel,
          sizeLabel: r.sizeLabel ?? r.Size,
          unitCost: r.unitCost ?? r["Unit Cost (LKR)"] ?? r.unit_cost,
          targetPrice: r.targetPrice ?? r["Target Price (LKR)"] ?? r.target_price,
          openingQty: r.openingQty ?? r["Initial Stock"] ?? r.opening_qty,
        });
        if (!parsed.success) {
          skipped++;
          if (skipReasons.length < MAX_SKIP_REASONS) {
            skipReasons.push(describeIssues(rowNumber, parsed.error));
          }
          continue;
        }

        const v = parsed.data;
        const brand = v.brand.trim();
        const category = v.category.trim();
        const modelName = v.modelName.trim();
        const sku = v.sku.trim();
        const sizeLabel = v.sizeLabel.trim();

        const product =
          (await tx.product.findFirst({ where: { brand, category, modelName } })) ??
          (await tx.product.create({ data: { brand, category, modelName } }));

        const existingVariant = await tx.variant.findUnique({ where: { sku } });
        if (existingVariant) {
          skipped++;
          if (skipReasons.length < MAX_SKIP_REASONS) {
            skipReasons.push(
              `Row ${rowNumber}: SKU ${sku} already exists — skipped (use Receive purchase to add stock).`,
            );
          }
          continue;
        }

        const variant = await tx.variant.create({
          data: {
            productId: product.id,
            sku,
            sizeLabel,
            targetPrice: Number.isFinite(v.targetPrice as number)
              ? Number(v.targetPrice)
              : null,
          },
        });

        if (v.openingQty > 0) {
          await tx.stockIn.create({
            data: {
              variantId: variant.id,
              receivedDate: new Date(),
              qty: v.openingQty,
              unitCost: v.unitCost,
              notes: "Opening stock import",
            },
          });
        }
        imported++;
      }
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Import failed. Please check your CSV.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/insights");
  return { ok: true, imported, skipped, skipReasons };
}

export async function importExpenses(
  _prevState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please select a CSV file." };
  }

  let rows: Record<string, string>[];
  try {
    rows = await parseCsv(file);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to parse CSV." };
  }

  if (rows.length === 0) return { error: "CSV is empty or has no valid rows." };

  let imported = 0;
  const skipReasons: string[] = [];
  let skipped = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]!;
        const rowNumber = i + 2; // account for the header row
        const parsed = expenseRowSchema.safeParse({
          date: r.date ?? r.Date,
          category: r.category ?? r.Category,
          description: r.description ?? r.Description,
          amount: r.amount ?? r["Amount (LKR)"] ?? r.Amount,
          paymentMethod: r.paymentMethod ?? r["Payment Method"] ?? r.Payment,
          notes: r.notes ?? r.Notes,
        });
        if (!parsed.success) {
          skipped++;
          if (skipReasons.length < MAX_SKIP_REASONS) {
            skipReasons.push(describeIssues(rowNumber, parsed.error));
          }
          continue;
        }

        const v = parsed.data;
        await tx.expense.create({
          data: {
            date: new Date(v.date),
            category: v.category.trim(),
            description: v.description.trim(),
            amount: v.amount,
            paymentMethod: v.paymentMethod as PaymentMethod,
            notes: v.notes?.trim() || null,
          },
        });
        imported++;
      }
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Import failed. Please check your CSV.",
    };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { ok: true, imported, skipped, skipReasons };
}

