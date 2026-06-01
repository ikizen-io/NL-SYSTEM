import * as React from "react";
import { cn } from "@/lib/cn";

const fieldClassName =
  "h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 shadow-sm shadow-zinc-950/[0.02] transition-colors placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-4 focus:ring-zinc-900/[0.04] disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-500";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(fieldClassName, className)}
      {...props}
    />
  );
});
Input.displayName = "Input";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-medium text-zinc-600", className)}
      {...props}
    />
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(fieldClassName, "min-h-20 resize-y py-2", className)}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { fieldClassName };

