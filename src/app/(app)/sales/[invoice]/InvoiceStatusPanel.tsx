"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { setInvoiceStatus, voidInvoice } from "./actions";

export function InvoiceStatusPanel({
  invoiceSlug,
  invoiceNo,
  status,
  hasPayments,
}: {
  invoiceSlug: string;
  invoiceNo: string;
  status: string;
  hasPayments: boolean;
}) {
  const [state, formAction, pending] = useActionState(setInvoiceStatus, {});

  useEffect(() => {
    if (state.ok) toast.success("Invoice status updated");
  }, [state.ok]);

  return (
    <div className="space-y-3">
      <ActionStateBanner error={state.error} />
      <form action={formAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="invoiceNo" value={invoiceSlug} />
        <div>
          <Label>Set status</Label>
          <Select name="status" defaultValue={status}>
            <option value="ISSUED">Issued / active</option>
            <option value="RETURNED">Returned (full invoice)</option>
            <option value="CANCELLED">Void</option>
          </Select>
        </div>
        <div className="md:self-end">
          <Button
            variant="outline"
            className="w-full"
            type="submit"
            disabled={pending}
          >
            {pending ? "Saving..." : "Save status"}
          </Button>
        </div>
      </form>

      <ConfirmActionForm
        action={voidInvoice}
        fields={{ invoiceNo: invoiceSlug }}
        title={`Void ${invoiceNo}?`}
        description={
          hasPayments
            ? "Voiding releases stock and removes this sale from revenue. If money was collected, record a refund on the Returns tab first — void is blocked until the deposit is settled."
            : "This keeps the invoice number and history, releases stock, and removes this sale from revenue."
        }
        confirmLabel="Confirm void"
        successMessage="Invoice voided"
        disabled={status === "CANCELLED"}
        trigger={
          <Button
            type="button"
            variant="danger"
            className="w-full"
            disabled={status === "CANCELLED"}
          >
            Void invoice
          </Button>
        }
      />

      <p className="text-xs text-zinc-500">
        Prefer the Returns tab for cancellations with deposits or goods coming
        back. Full status return releases stock without creating a restock
        adjustment (use Returns if you need restock).
      </p>
    </div>
  );
}
