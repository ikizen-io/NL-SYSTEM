"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatLkr } from "@/lib/format";
import { toast } from "sonner";
import { deletePayment, updatePayment } from "./actions";

type Payment = {
  id: string;
  date: string;
  method: "BANK" | "CASH" | "COD" | "TRANSFER" | "OTHER";
  amount: number;
  reference: string;
};

function PaymentRow({
  invoiceNo,
  payment,
  disabled,
}: {
  invoiceNo: string;
  payment: Payment;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePayment, {});

  useEffect(() => {
    if (state.ok) toast.success("Payment updated");
  }, [state.ok]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3">
        <ActionStateBanner error={state.error} />
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-12">
        <input type="hidden" name="invoiceNo" value={invoiceNo} />
        <input type="hidden" name="paymentId" value={payment.id} />
        <div className="md:col-span-3">
          <Label>Date</Label>
          <Input name="date" type="date" defaultValue={payment.date} disabled={disabled} />
        </div>
        <div className="md:col-span-2">
          <Label>Method</Label>
          <Select name="method" defaultValue={payment.method} disabled={disabled}>
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
            <option value="TRANSFER">Transfer</option>
            <option value="COD">COD</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label>Amount</Label>
          <Input
            name="amount"
            type="number"
            min={1}
            step={1}
            defaultValue={payment.amount}
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-3">
          <Label>Reference</Label>
          <Input name="reference" defaultValue={payment.reference} disabled={disabled} />
        </div>
        <div className="flex gap-2 md:col-span-2 md:self-end">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending || disabled}
            className="flex-1"
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>

      <div className="mt-2 flex justify-end">
        <ConfirmActionForm
          action={deletePayment}
          fields={{ invoiceNo, paymentId: payment.id }}
          title="Delete this payment?"
          description="This removes the payment record from the invoice. The invoice balance will increase."
          confirmLabel="Delete payment"
          successMessage="Payment deleted"
          disabled={disabled}
          trigger={
            <Button type="button" variant="ghost" size="xs" disabled={disabled}>
              Delete payment
            </Button>
          }
        />
      </div>
    </div>
  );
}

export function PaymentManager({
  invoiceNo,
  payments,
  disabled,
}: {
  invoiceNo: string;
  payments: Payment[];
  disabled: boolean;
}) {
  if (payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <PaymentRow
          key={payment.id}
          invoiceNo={invoiceNo}
          payment={payment}
          disabled={disabled}
        />
      ))}
      <div className="text-right text-sm text-zinc-600">
        Total paid:{" "}
        <span className="font-semibold text-zinc-950">
          {formatLkr(payments.reduce((sum, payment) => sum + payment.amount, 0))}
        </span>
      </div>
    </div>
  );
}
