"use server";

import { prisma } from "@/lib/prisma";
import { decodeCustomerSlug } from "@/lib/invoices";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type CustomerActionState = {
  ok?: boolean;
  error?: string;
};

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value == null ? "" : value),
    z.string().max(max).optional().or(z.literal("")),
  );

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(80),
  phone: optionalText(40),
  instagramHandle: optionalText(60),
  address: optionalText(240),
  notes: optionalText(500),
});

export async function updateCustomer(
  _prevState: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const parsed = updateCustomerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    instagramHandle: formData.get("instagramHandle"),
    address: formData.get("address"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Please check the customer details." };
  }

  const v = parsed.data;
  const name = v.name.trim();

  try {
    const existing = await prisma.customer.findUnique({ where: { name } });
    if (!existing) return { error: "Customer not found." };

    await prisma.customer.update({
      where: { name },
      data: {
        phone: v.phone?.trim() || null,
        instagramHandle: v.instagramHandle?.trim() || null,
        address: v.address?.trim() || null,
        notes: v.notes?.trim() || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update customer. Please try again.",
    };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${encodeURIComponent(name)}`);
  revalidatePath("/sales");
  return { ok: true };
}

export async function loadCustomerBySlug(slug: string) {
  const decoded = decodeCustomerSlug(slug);
  return prisma.customer.findUnique({
    where: { name: decoded },
    include: {
      invoices: {
        include: {
          items: true,
          payments: true,
          returnRecords: { include: { items: true } },
        },
        orderBy: { issuedDate: "desc" },
      },
    },
  });
}
