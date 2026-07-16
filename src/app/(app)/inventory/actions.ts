"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteSkuPhoto, isImageUploadConfigured, uploadSkuPhoto } from "@/lib/storage";

function photoFromFormData(formData: FormData): File | null {
  const value = formData.get("photo");
  return value instanceof File && value.size > 0 ? value : null;
}

export type ActionState = {
  ok?: boolean;
  error?: string;
};

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

function sanitizeForSku(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function generateSkuBase(parts: {
  brand: string;
  modelName: string;
  sizeLabel: string;
  color?: string | null;
}) {
  const brand = sanitizeForSku(parts.brand).slice(0, 3) || "SKU";
  const model = sanitizeForSku(parts.modelName).slice(0, 4);
  const size = sanitizeForSku(parts.sizeLabel).slice(0, 3);
  const color = parts.color ? sanitizeForSku(parts.color).slice(0, 3) : "";
  return [brand, model, size, color].filter(Boolean).join("");
}

type SkuLookup = {
  variant: { findUnique: (args: { where: { sku: string } }) => Promise<unknown> };
};

async function ensureUniqueSku(client: SkuLookup, base: string): Promise<string> {
  const root = base || "SKU";
  let candidate = root;
  let counter = 1;
  while (counter < 1000) {
    const existing = await client.variant.findUnique({ where: { sku: candidate } });
    if (!existing) return candidate;
    counter += 1;
    candidate = `${root}${counter}`;
  }
  throw new Error("Could not generate a unique SKU code");
}

const createSkuSchema = z.object({
  sku: optionalText(50),
  brand: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  modelName: z.string().min(1).max(100),
  sizeLabel: z.string().min(1).max(50),
  color: optionalText(50),
  targetPrice: optionalMoney(z.coerce.number().int().positive()),
  reorderPoint: optionalMoney(z.coerce.number().int().nonnegative()),
});

export async function createSku(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSkuSchema.safeParse({
    sku: formData.get("sku"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    modelName: formData.get("modelName"),
    sizeLabel: formData.get("sizeLabel"),
    color: formData.get("color"),
    targetPrice: formData.get("targetPrice"),
    reorderPoint: formData.get("reorderPoint"),
  });

  if (!parsed.success) {
    return { error: "Please complete the SKU details." };
  }

  const v = parsed.data;
  const brand = v.brand.trim();
  const category = v.category.trim();
  const modelName = v.modelName.trim();
  const sizeLabel = v.sizeLabel.trim();
  const color = v.color?.trim() || null;
  const requestedSku = (v.sku ?? "").trim();

  if (!brand || !category) return { error: "Brand and category are required." };

  const photo = photoFromFormData(formData);

  try {
    const createdSku = await prisma.$transaction(async (tx) => {
      const product =
        (await tx.product.findFirst({
          where: { brand, category, modelName },
        })) ??
        (await tx.product.create({
          data: { brand, category, modelName },
        }));

      let sku: string;
      if (requestedSku) {
        const existing = await tx.variant.findUnique({
          where: { sku: requestedSku },
        });
        if (existing) {
          throw new Error(
            `SKU "${requestedSku}" already exists. Use a different code or leave blank to auto-generate.`,
          );
        }
        sku = requestedSku;
      } else {
        sku = await ensureUniqueSku(
          tx,
          generateSkuBase({ brand, modelName, sizeLabel, color }),
        );
      }

      await tx.variant.create({
        data: {
          productId: product.id,
          sku,
          sizeLabel,
          color,
          targetPrice: Number.isFinite(v.targetPrice as number)
            ? Number(v.targetPrice)
            : null,
          reorderPoint: Number.isFinite(v.reorderPoint as number)
            ? Number(v.reorderPoint)
            : 1,
        },
      });

      return sku;
    });

    if (photo && isImageUploadConfigured()) {
      try {
        const imageUrl = await uploadSkuPhoto(photo, createdSku);
        await prisma.variant.update({
          where: { sku: createdSku },
          data: { imageUrl },
        });
      } catch (photoError) {
        // The SKU itself was created successfully; surface the photo issue
        // without treating SKU creation as a failure.
        return {
          ok: true,
          error:
            photoError instanceof Error
              ? `SKU created, but the photo didn't upload: ${photoError.message}`
              : "SKU created, but the photo didn't upload.",
        };
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create SKU. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/receive");
  revalidatePath("/insights");
  return { ok: true };
}

const purchaseLineSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    sku: z.string().min(1).max(50),
    qty: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().int().positive(),
  }),
  z.object({
    mode: z.literal("new"),
    brand: z.string().min(1).max(50),
    category: z.string().min(1).max(50),
    modelName: z.string().min(1).max(100),
    sizeLabel: z.string().min(1).max(50),
    color: z.string().nullable().optional(),
    targetPrice: z.number().nullable().optional(),
    sku: z.string().max(50).optional(),
    qty: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().int().positive(),
  }),
]);

const receivePurchaseSchema = z
  .object({
    receivedDate: z.string().min(1),
    supplierId: optionalText(50),
    supplierCustom: optionalText(80),
    purchaseRef: optionalText(80),
    extraCost: optionalMoney(z.coerce.number().int().nonnegative()),
    notes: optionalText(200),
    lines: z.array(purchaseLineSchema).min(1),
  })
  .superRefine((v, ctx) => {
    if (v.supplierId === "__NEW__" && !(v.supplierCustom ?? "").trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["supplierCustom"],
        message: "Supplier name required",
      });
    }
  });

export async function receivePurchase(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawLines = formData.get("lines");
  let lines: unknown = [];
  if (typeof rawLines === "string") {
    try {
      lines = JSON.parse(rawLines);
    } catch {
      lines = [];
    }
  }

  const parsed = receivePurchaseSchema.safeParse({
    receivedDate: formData.get("receivedDate"),
    supplierId: formData.get("supplierId"),
    supplierCustom: formData.get("supplierCustom"),
    purchaseRef: formData.get("purchaseRef"),
    extraCost: formData.get("extraCost"),
    notes: formData.get("notes"),
    lines,
  });

  if (!parsed.success) {
    return { error: "Please complete the purchase details before saving." };
  }

  const v = parsed.data;
  const extraCost = Number.isFinite(v.extraCost as number)
    ? Number(v.extraCost)
    : 0;

  const totalLineValue = v.lines.reduce(
    (sum, line) => sum + line.qty * line.unitCost,
    0,
  );
  if (totalLineValue <= 0) {
    return { error: "Each line needs a positive qty and unit cost." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      let supplierRecord: { id: string; name: string } | null = null;
      if (v.supplierId === "__NEW__") {
        const name = (v.supplierCustom ?? "").trim();
        if (name) {
          supplierRecord = await tx.supplier.upsert({
            where: { name },
            update: { active: true },
            create: { name },
            select: { id: true, name: true },
          });
        }
      } else if (v.supplierId) {
        supplierRecord = await tx.supplier.findFirst({
          where: { id: v.supplierId, active: true },
          select: { id: true, name: true },
        });
      }

      const receivedDate = new Date(v.receivedDate);
      const purchaseRef = v.purchaseRef?.trim() || null;
      const sharedNotes = v.notes?.trim() || null;
      let allocatedSoFar = 0;

      for (let index = 0; index < v.lines.length; index += 1) {
        const line = v.lines[index];
        let variantId: string;

        if (line.mode === "existing") {
          const existing = await tx.variant.findFirst({
            where: { sku: line.sku.trim(), active: true },
          });
          if (!existing) {
            throw new Error(`SKU not found or archived: ${line.sku}`);
          }
          variantId = existing.id;
        } else {
          const brand = line.brand.trim();
          const category = line.category.trim();
          const modelName = line.modelName.trim();
          const sizeLabel = line.sizeLabel.trim();
          const color = line.color?.trim() || null;
          const requestedSku = (line.sku ?? "").trim();

          const product =
            (await tx.product.findFirst({
              where: { brand, category, modelName },
            })) ??
            (await tx.product.create({
              data: { brand, category, modelName },
            }));

          let sku: string;
          if (requestedSku) {
            const existingSku = await tx.variant.findUnique({
              where: { sku: requestedSku },
            });
            if (existingSku) {
              throw new Error(
                `SKU "${requestedSku}" already exists. Use a different code or leave blank.`,
              );
            }
            sku = requestedSku;
          } else {
            sku = await ensureUniqueSku(
              tx,
              generateSkuBase({ brand, modelName, sizeLabel, color }),
            );
          }

          const variant = await tx.variant.create({
            data: {
              productId: product.id,
              sku,
              sizeLabel,
              color,
              targetPrice:
                line.targetPrice && line.targetPrice > 0
                  ? Math.round(line.targetPrice)
                  : null,
            },
          });
          variantId = variant.id;
        }

        const lineValue = line.qty * line.unitCost;
        let allocatedExtra = 0;
        if (extraCost > 0 && totalLineValue > 0) {
          if (index === v.lines.length - 1) {
            allocatedExtra = extraCost - allocatedSoFar;
          } else {
            allocatedExtra = Math.round((lineValue / totalLineValue) * extraCost);
            allocatedSoFar += allocatedExtra;
          }
        }

        await tx.stockIn.create({
          data: {
            variantId,
            supplierId: supplierRecord?.id ?? null,
            supplier: supplierRecord?.name ?? null,
            receivedDate,
            qty: line.qty,
            unitCost: line.unitCost,
            purchaseRef,
            extraCost: allocatedExtra > 0 ? allocatedExtra : null,
            notes: sharedNotes,
          },
        });
      }
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save purchase. Please check the details.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/receive");
  revalidatePath("/inventory/suppliers");
  revalidatePath("/sales");
  revalidatePath("/insights");
  revalidatePath("/dashboard");
  return { ok: true };
}

const supplierSchema = z.object({
  name: z.string().min(1).max(80),
  notes: optionalText(200),
});

export async function createSupplier(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Please enter a supplier name." };
  }

  try {
    await prisma.supplier.upsert({
      where: { name: parsed.data.name.trim() },
      update: { active: true, notes: parsed.data.notes?.trim() || null },
      create: {
        name: parsed.data.name.trim(),
        notes: parsed.data.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save supplier. Please try again.",
    };
  }

  revalidatePath("/inventory/suppliers");
  revalidatePath("/inventory/receive");
  return { ok: true };
}

const updateSupplierSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  notes: optionalText(200),
});

export async function updateSupplier(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Please check the supplier details." };
  }

  try {
    await prisma.supplier.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name.trim(),
        notes: parsed.data.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update supplier. Please try again.",
    };
  }

  revalidatePath("/inventory/suppliers");
  revalidatePath("/inventory/receive");
  return { ok: true };
}

const supplierIdSchema = z.object({
  id: z.string().min(1),
});

export async function removeSupplier(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { error: "Invalid supplier." };
  }

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parsed.data.id },
      include: { stockIns: { select: { id: true }, take: 1 } },
    });
    if (!supplier) return { error: "Supplier not found." };

    if (supplier.stockIns.length > 0) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { active: false },
      });
    } else {
      await prisma.supplier.delete({ where: { id: supplier.id } });
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not remove supplier. Please try again.",
    };
  }

  revalidatePath("/inventory/suppliers");
  revalidatePath("/inventory/receive");
  return { ok: true };
}

function currentStockForVariant(variant: {
  stockIns: { qty: number }[];
  adjustments: { qtyDelta: number }[];
  invoiceItems: { qty: number; invoice: { status: string } }[];
}) {
  const received = variant.stockIns.reduce((sum, stock) => sum + stock.qty, 0);
  const adjusted = variant.adjustments.reduce(
    (sum, adj) => sum + adj.qtyDelta,
    0,
  );
  const sold = variant.invoiceItems.reduce(
    (sum, item) => sum + (item.invoice.status === "ISSUED" ? item.qty : 0),
    0,
  );
  return received + adjusted - sold;
}

const stockCountSchema = z.object({
  sku: z.string().min(1),
  date: z.string().min(1),
  countedQty: z.coerce.number().int().nonnegative(),
  reason: z.string().min(1).max(80),
  notes: optionalText(200),
});

export async function setStockCount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = stockCountSchema.safeParse({
    sku: formData.get("sku"),
    date: formData.get("date"),
    countedQty: formData.get("countedQty"),
    reason: formData.get("reason"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Please complete the stock adjustment details." };
  }

  const variant = await prisma.variant.findFirst({
    where: { sku: parsed.data.sku, active: true },
    include: {
      stockIns: { select: { qty: true } },
      adjustments: { select: { qtyDelta: true } },
      invoiceItems: { include: { invoice: { select: { status: true } } } },
    },
  });
  if (!variant) return { error: "Unknown or archived SKU." };

  const current = currentStockForVariant(variant);
  const qtyDelta = parsed.data.countedQty - current;
  if (qtyDelta === 0) {
    return { error: "Counted stock matches current stock — no adjustment needed." };
  }

  try {
    await prisma.stockAdjustment.create({
      data: {
        variantId: variant.id,
        date: new Date(parsed.data.date),
        qtyDelta,
        reason: parsed.data.reason.trim(),
        notes: parsed.data.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save stock adjustment. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/adjust");
  revalidatePath("/sales");
  return { ok: true };
}

const removeSkuSchema = z.object({
  sku: z.string().min(1),
});

export async function removeSku(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = removeSkuSchema.safeParse({ sku: formData.get("sku") });
  if (!parsed.success) {
    return { error: "Invalid SKU." };
  }

  try {
    const sku = parsed.data.sku.trim();
    const variant = await prisma.variant.findUnique({
      where: { sku },
      include: {
        stockIns: { select: { id: true }, take: 1 },
        adjustments: { select: { id: true }, take: 1 },
        invoiceItems: { select: { id: true }, take: 1 },
      },
    });
    if (!variant) return { error: "SKU not found." };

    const hasHistory =
      variant.stockIns.length > 0 ||
      variant.adjustments.length > 0 ||
      variant.invoiceItems.length > 0;

    if (hasHistory) {
      await prisma.variant.update({
        where: { id: variant.id },
        data: { active: false },
      });
    } else {
      const productId = variant.productId;
      await prisma.variant.delete({ where: { id: variant.id } });

      const remaining = await prisma.variant.count({ where: { productId } });
      if (remaining === 0) {
        await prisma.product.delete({ where: { id: productId } });
      }
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not remove SKU. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/receive");
  revalidatePath("/sales");
  revalidatePath("/insights");
  return { ok: true };
}

export async function restoreSupplier(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = supplierIdSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { error: "Invalid supplier." };
  }

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: parsed.data.id },
    });
    if (!supplier) return { error: "Supplier not found." };

    if (!supplier.active) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { active: true },
      });
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not restore supplier. Please try again.",
    };
  }

  revalidatePath("/inventory/suppliers");
  revalidatePath("/inventory/receive");
  return { ok: true };
}

export async function restoreSku(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = removeSkuSchema.safeParse({ sku: formData.get("sku") });
  if (!parsed.success) {
    return { error: "Invalid SKU." };
  }

  try {
    const variant = await prisma.variant.findUnique({
      where: { sku: parsed.data.sku.trim() },
    });
    if (!variant) return { error: "SKU not found." };

    if (!variant.active) {
      await prisma.variant.update({
        where: { id: variant.id },
        data: { active: true },
      });
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not restore SKU. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/receive");
  revalidatePath("/sales");
  revalidatePath("/insights");
  revalidatePath(`/inventory/${encodeURIComponent(parsed.data.sku.trim())}/edit`);
  return { ok: true };
}

const updateSkuSchema = z.object({
  sku: z.string().min(1),
  brand: z.string().min(1).max(50),
  category: z.string().min(1).max(50),
  modelName: z.string().min(1).max(100),
  sizeLabel: z.string().min(1).max(50),
  color: optionalText(50),
  targetPrice: z.coerce.number().int().positive().optional().or(z.nan()),
  reorderPoint: z.coerce.number().int().nonnegative().optional().or(z.nan()),
  latestStockInId: optionalText(80),
  latestUnitCost: z.coerce.number().int().positive().optional().or(z.nan()),
  latestExtraCost: z.coerce.number().int().nonnegative().optional().or(z.nan()),
  removePhoto: optionalText(10),
});

export async function updateSku(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSkuSchema.safeParse({
    sku: formData.get("sku"),
    brand: formData.get("brand"),
    category: formData.get("category"),
    modelName: formData.get("modelName"),
    sizeLabel: formData.get("sizeLabel"),
    color: formData.get("color"),
    targetPrice: formData.get("targetPrice"),
    reorderPoint: formData.get("reorderPoint"),
    latestStockInId: formData.get("latestStockInId"),
    latestUnitCost: formData.get("latestUnitCost"),
    latestExtraCost: formData.get("latestExtraCost"),
    removePhoto: formData.get("removePhoto"),
  });
  if (!parsed.success) {
    return { error: "Please complete the SKU details." };
  }

  const v = parsed.data;
  const photo = photoFromFormData(formData);
  const variant = await prisma.variant.findFirst({
    where: { sku: v.sku, active: true },
    include: { product: true },
  });
  if (!variant) return { error: "Unknown active SKU." };

  const brand = v.brand.trim();
  const category = v.category.trim();
  const modelName = v.modelName.trim();

  if (!brand || !category || !modelName) {
    return { error: "Brand, category, and model are required." };
  }

  let photoWarning: string | undefined;
  let nextImageUrl: string | null | undefined;

  if (photo && isImageUploadConfigured()) {
    try {
      nextImageUrl = await uploadSkuPhoto(photo, variant.sku);
    } catch (photoError) {
      photoWarning =
        photoError instanceof Error
          ? `Details saved, but the photo didn't upload: ${photoError.message}`
          : "Details saved, but the photo didn't upload.";
    }
  } else if (v.removePhoto === "true" || v.removePhoto === "1") {
    nextImageUrl = null;
  }

  try {
    const product =
      (await prisma.product.findFirst({
        where: { brand, category, modelName },
      })) ??
      (await prisma.product.create({
        data: { brand, category, modelName },
      }));

    await prisma.$transaction(async (tx) => {
      await tx.variant.update({
        where: { id: variant.id },
        data: {
          productId: product.id,
          sizeLabel: v.sizeLabel.trim(),
          color: v.color?.trim() || null,
          targetPrice: Number.isFinite(v.targetPrice as number)
            ? Number(v.targetPrice)
            : null,
          reorderPoint: Number.isFinite(v.reorderPoint as number)
            ? Number(v.reorderPoint)
            : 1,
          ...(nextImageUrl !== undefined ? { imageUrl: nextImageUrl } : {}),
        },
      });

      if (v.latestStockInId) {
        const updateData: { unitCost?: number; extraCost?: number | null } = {};
        if (Number.isFinite(v.latestUnitCost as number)) {
          updateData.unitCost = Number(v.latestUnitCost);
        }
        if (Number.isFinite(v.latestExtraCost as number)) {
          updateData.extraCost = Number(v.latestExtraCost);
        }
        if (Object.keys(updateData).length > 0) {
          await tx.stockIn.update({
            where: { id: v.latestStockInId },
            data: updateData,
          });
        }
      }

      const oldProductVariantCount = await tx.variant.count({
        where: { productId: variant.productId },
      });
      if (oldProductVariantCount === 0) {
        await tx.product.delete({ where: { id: variant.productId } });
      }
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update SKU. Please check the details.",
    };
  }

  if (nextImageUrl !== undefined && variant.imageUrl && variant.imageUrl !== nextImageUrl) {
    await deleteSkuPhoto(variant.imageUrl);
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${encodeURIComponent(v.sku)}/edit`);
  revalidatePath("/inventory/receive");
  revalidatePath("/sales");
  revalidatePath("/insights");
  return { ok: true, error: photoWarning };
}

const updateStockInSchema = z.object({
  id: z.string().min(1),
  sku: z.string().min(1),
  receivedDate: z.string().min(1),
  supplierId: optionalText(50),
  supplierCustom: optionalText(80),
  purchaseRef: optionalText(80),
  unitCost: z.coerce.number().int().positive(),
  extraCost: optionalMoney(z.coerce.number().int().nonnegative()),
  notes: optionalText(200),
});

export async function updateStockIn(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStockInSchema.safeParse({
    id: formData.get("id"),
    sku: formData.get("sku"),
    receivedDate: formData.get("receivedDate"),
    supplierId: formData.get("supplierId"),
    supplierCustom: formData.get("supplierCustom"),
    purchaseRef: formData.get("purchaseRef"),
    unitCost: formData.get("unitCost"),
    extraCost: formData.get("extraCost"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: "Please check the stock-in details." };
  }

  const v = parsed.data;

  try {
    let supplierId: string | null = null;
    let supplierName: string | null = null;

    if (v.supplierId === "__NEW__") {
      const name = (v.supplierCustom ?? "").trim();
      if (name) {
        const rec = await prisma.supplier.upsert({
          where: { name },
          update: { active: true },
          create: { name },
          select: { id: true, name: true },
        });
        supplierId = rec.id;
        supplierName = rec.name;
      }
    } else if (v.supplierId) {
      const rec = await prisma.supplier.findFirst({
        where: { id: v.supplierId, active: true },
        select: { id: true, name: true },
      });
      if (rec) {
        supplierId = rec.id;
        supplierName = rec.name;
      }
    }

    await prisma.stockIn.update({
      where: { id: v.id },
      data: {
        receivedDate: new Date(v.receivedDate),
        supplierId,
        supplier: supplierName,
        purchaseRef: v.purchaseRef?.trim() || null,
        unitCost: v.unitCost,
        extraCost: Number.isFinite(v.extraCost as number) && (v.extraCost as number) > 0
          ? Number(v.extraCost)
          : null,
        notes: v.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update stock-in. Please try again.",
    };
  }

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${encodeURIComponent(v.sku)}/edit`);
  revalidatePath("/inventory/stock-ins");
  return { ok: true };
}
