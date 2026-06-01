"use client";

import { useActionState, useEffect } from "react";
import { Button } from "./button";
import { ActionStateBanner } from "./form-patterns";
import { toast } from "sonner";

type ActionState = { ok?: boolean; error?: string };

export function RestoreButton({
  action,
  fields,
  successMessage,
  label = "Restore",
  size = "xs",
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  successMessage: string;
  label?: string;
  size?: "xs" | "sm";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) toast.success(successMessage);
  }, [state.ok, successMessage]);

  return (
    <form action={formAction} className="inline-flex flex-col items-end gap-1">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ActionStateBanner error={state.error} />
      <Button type="submit" variant="outline" size={size} disabled={pending}>
        {pending ? "Restoring..." : label}
      </Button>
    </form>
  );
}
