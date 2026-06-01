"use client";

import { useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TD } from "@/components/ui/table";
import { toast } from "sonner";
import { removeSupplier, restoreSupplier, updateSupplier } from "../actions";
import { RestoreButton } from "@/components/ui/restore-button";

export function SupplierRow({
  supplier,
}: {
  supplier: {
    id: string;
    name: string;
    notes: string | null;
    active: boolean;
    stockInCount: number;
  };
}) {
  const formId = `supplier-${supplier.id}`;
  const [state, formAction, pending] = useActionState(updateSupplier, {});

  useEffect(() => {
    if (state.ok) toast.success("Supplier updated");
  }, [state.ok]);

  return (
    <tr className="hover:bg-zinc-50">
      <TD>
        <form id={formId} action={formAction} className="min-w-56 space-y-2">
          <input type="hidden" name="id" value={supplier.id} />
          <ActionStateBanner error={state.error} />
          <Input name="name" defaultValue={supplier.name} required />
        </form>
      </TD>
      <TD>
        <Input
          form={formId}
          name="notes"
          defaultValue={supplier.notes ?? ""}
          placeholder="Optional"
        />
      </TD>
      <TD align="right">{supplier.stockInCount}</TD>
      <TD>
        <Badge tone={supplier.active ? "success" : "neutral"}>
          {supplier.active ? "Active" : "Archived"}
        </Badge>
      </TD>
      <TD align="right">
        <div className="flex justify-end gap-2">
          <Button form={formId} variant="outline" size="xs" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
          {supplier.active ? (
            <ConfirmActionForm
              action={removeSupplier}
              fields={{ id: supplier.id }}
              title={`Remove ${supplier.name}?`}
              description={
                supplier.stockInCount > 0
                  ? "This supplier has stock-in history and will be archived, not deleted."
                  : "This supplier has no stock-in history and will be deleted permanently."
              }
              confirmLabel={
                supplier.stockInCount > 0 ? "Archive supplier" : "Delete supplier"
              }
              successMessage={
                supplier.stockInCount > 0 ? "Supplier archived" : "Supplier removed"
              }
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  Remove
                </Button>
              }
            />
          ) : (
            <RestoreButton
              action={restoreSupplier}
              fields={{ id: supplier.id }}
              successMessage="Supplier restored"
            />
          )}
        </div>
      </TD>
    </tr>
  );
}
