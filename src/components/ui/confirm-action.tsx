"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { ActionStateBanner } from "./form-patterns";

type ActionState = { ok?: boolean; error?: string };

export function ConfirmActionForm({
  action,
  fields,
  title,
  description,
  confirmLabel = "Confirm",
  successMessage,
  trigger,
  disabled = false,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  title: string;
  description: string;
  confirmLabel?: string;
  successMessage?: string;
  trigger: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await action(prevState, formData);
      if (result.ok) {
        if (successMessage) toast.success(successMessage);
        setOpen(false);
      }
      return result;
    },
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionStateBanner error={state.error} />
        <form action={formAction} className="mt-4 flex justify-end gap-2">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Working..." : confirmLabel}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
