import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-[-0.01em] transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/15",
    "disabled:pointer-events-none disabled:opacity-45",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-zinc-950 text-white shadow-[0_1px_1px_rgba(24,24,27,0.10)] hover:bg-zinc-800",
        secondary:
          "bg-zinc-100 text-zinc-950 hover:bg-zinc-200/80",
        outline:
          "border border-zinc-200 bg-white text-zinc-950 shadow-sm hover:border-zinc-300 hover:bg-zinc-50",
        ghost: "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
        danger:
          "bg-red-600 text-white shadow-[0_1px_1px_rgba(127,29,29,0.18)] hover:bg-red-700",
      },
      size: {
        xs: "h-8 px-2.5 text-xs",
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };

