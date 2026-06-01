"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { createExpense } from "./actions";

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(createExpense, {});

  useEffect(() => {
    if (state.ok) toast.success("Expense added");
  }, [state.ok]);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-6">
      <div className="md:col-span-6">
        <ActionStateBanner error={state.error} />
      </div>

      <div className="md:col-span-1">
        <Label>Date</Label>
        <Input
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          required
        />
      </div>
      <div className="md:col-span-1">
        <Label>Category</Label>
        <Input name="category" placeholder="Marketing" required />
      </div>
      <div className="md:col-span-2">
        <Label>Description</Label>
        <Input name="description" placeholder="Instagram – Post Boost" required />
      </div>
      <div className="md:col-span-1">
        <Label>Amount (LKR)</Label>
        <Input name="amount" type="number" min={1} step={1} required />
      </div>
      <div className="md:col-span-1">
        <Label>Payment</Label>
        <Select name="paymentMethod" defaultValue="BANK">
          <option value="BANK">Bank</option>
          <option value="CASH">Cash</option>
          <option value="TRANSFER">Transfer</option>
          <option value="COD">COD</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>
      <div className="md:col-span-5">
        <Label>Notes</Label>
        <Input name="notes" placeholder="Nov 2025 campaign" />
      </div>
      <div className="md:col-span-1 md:self-end">
        <Button className="w-full" disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
      </div>
    </form>
  );
}
