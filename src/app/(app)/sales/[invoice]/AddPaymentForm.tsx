"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatLkr } from "@/lib/format";
import { safeInt } from "@/lib/forms";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { toast } from "sonner";
import { addPayment } from "./actions";

export function AddPaymentForm({
  invoice,
  balance,
  disabled,
}: {
  invoice: string;
  balance: number;
  disabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(addPayment, {});
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (state.ok) toast.success("Payment added");
  }, [state.ok]);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="invoiceNo" value={invoice} />
      <div className="md:col-span-2">
        <ActionStateBanner error={state.error} />
      </div>
      <div>
        <Label>Date</Label>
        <Input
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <Label>Method</Label>
        <Select name="method" defaultValue="BANK" disabled={disabled}>
          {paymentMethodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label>Amount (LKR)</Label>
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-950"
            disabled={disabled || balance <= 0}
            onClick={() => setAmount(String(Math.max(0, balance)))}
          >
            Pay full {formatLkr(Math.max(0, balance))}
          </button>
        </div>
        <Input
          name="amount"
          type="number"
          min={1}
          max={Math.max(0, balance)}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(String(safeInt(e.target.value, 0) || ""))}
          disabled={disabled || balance <= 0}
        />
      </div>
      <div>
        <Label>Reference (optional)</Label>
        <Input
          name="reference"
          placeholder="Bank ref / receipt note"
          disabled={disabled}
        />
      </div>
      <div className="md:col-span-2">
        <Button
          className="w-full"
          disabled={pending || disabled || balance <= 0}
        >
          {pending ? "Adding..." : "Add payment"}
        </Button>
      </div>
    </form>
  );
}

