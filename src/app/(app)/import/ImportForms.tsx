"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { toast } from "sonner";
import { importInventory, importExpenses, type ImportActionState } from "./actions";

function SkippedRowsNotice({ state }: { state: ImportActionState }) {
  if (!state.ok || !state.skipped) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
      <div className="font-medium">
        Skipped {state.skipped} row{state.skipped === 1 ? "" : "s"} that failed validation.
      </div>
      {state.skipReasons && state.skipReasons.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          {state.skipReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
          {state.skipped > state.skipReasons.length ? (
            <li>...and {state.skipped - state.skipReasons.length} more.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

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
      <SkippedRowsNotice state={state} />
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
      <SkippedRowsNotice state={state} />
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
