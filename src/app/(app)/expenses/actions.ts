"use server";

import { prisma } from "@/lib/prisma";
import { paymentMethodValues } from "@/lib/payment-methods";
import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ExpenseActionState = {
  ok?: boolean;
  error?: string;
};

const expenseSchema = z.object({
  date: z.string().min(1),
  category: z.string().min(1).max(50),
  description: z.string().min(1).max(200),
  amount: z.coerce.number().int().positive(),
  paymentMethod: z.enum(paymentMethodValues),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export async function createExpense(
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Please complete all expense fields before saving." };
  }

  try {
    const v = parsed.data;
    await prisma.expense.create({
      data: {
        date: new Date(v.date),
        category: v.category.trim(),
        description: v.description.trim(),
        amount: v.amount,
        paymentMethod: v.paymentMethod as PaymentMethod,
        notes: v.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not save expense. Please try again.",
    };
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
  return { ok: true };
}
