"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { setInvoiceStatus, voidInvoice } from "./actions";

export function InvoiceStatusPanel({
  invoiceSlug,
  invoiceNo,
  status,
}: {
  invoiceSlug: string;
  invoiceNo: string;
  status: string;
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

      <Dialog>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="danger"
            className="w-full"
            disabled={status === "CANCELLED"}
          >
            Void invoice
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void {invoiceNo}?</DialogTitle>
            <DialogDescription>
              This keeps the invoice number and history, releases stock, and
              removes this sale from revenue.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <form action={voidInvoice}>
              <input type="hidden" name="invoiceNo" value={invoiceSlug} />
              <Button type="submit" variant="danger">
                Confirm void
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-zinc-500">
        For line-level returns or exchanges, use the Returns tab. Full return
        restocks remaining qty and reverses revenue.
      </p>
    </div>
  );
}
