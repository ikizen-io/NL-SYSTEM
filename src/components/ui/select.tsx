import * as React from "react";
import { cn } from "@/lib/cn";
import { fieldClassName } from "./input";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldClassName, "pr-8", className)}
      {...props}
    />
  );
}

