"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { toast } from "sonner";
import { importInventory, importExpenses } from "./actions";

export function ImportInventoryForm() {
  const [state, formAction, pending] = useActionState(importInventory, {});

  useEffect(() => {
    if (state.ok)
      toast.success(
        state.imported !== undefined
          ? `Imported ${state.imported} row${state.imported === 1 ? "" : "s"}`
          : "Inventory imported",
      );
  }, [state.ok, state.imported]);

  return (
    <form action={formAction} className="space-y-3">
      <ActionStateBanner error={state.error} />
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm"
        required
      />
      <Button className="w-full" disabled={pending}>
        {pending ? "Importing..." : "Import inventory"}
      </Button>
    </form>
  );
}

export function ImportExpensesForm() {
  const [state, formAction, pending] = useActionState(importExpenses, {});

  useEffect(() => {
    if (state.ok)
      toast.success(
        state.imported !== undefined
          ? `Imported ${state.imported} expense${state.imported === 1 ? "" : "s"}`
          : "Expenses imported",
      );
  }, [state.ok, state.imported]);

  return (
    <form action={formAction} className="space-y-3">
      <ActionStateBanner error={state.error} />
      <input
        type="file"
        name="file"
        accept=".csv,text/csv"
        className="w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm"
        required
      />
      <Button className="w-full" disabled={pending}>
        {pending ? "Importing..." : "Import expenses"}
      </Button>
    </form>
  );
}
