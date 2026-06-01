"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";
import { createSupplier } from "../actions";

export function SupplierAddForm() {
  const [state, formAction, pending] = useActionState(createSupplier, {});

  useEffect(() => {
    if (state.ok) toast.success("Supplier added");
  }, [state.ok]);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-3">
      <div className="md:col-span-3">
        <ActionStateBanner error={state.error} />
      </div>
      <div>
        <Label>Name</Label>
        <Input name="name" placeholder="e.g. Local sports supplier" required />
      </div>
      <div>
        <Label>Notes</Label>
        <Input name="notes" placeholder="Optional" />
      </div>
      <div className="md:self-end">
        <Button className="w-full" disabled={pending}>
          {pending ? "Adding..." : "Add supplier"}
        </Button>
      </div>
    </form>
  );
}
