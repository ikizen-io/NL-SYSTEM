import * as React from "react";
import { cn } from "@/lib/cn";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn("min-w-full text-sm", className)} {...props} />
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 bg-zinc-50/95 text-left text-[11px] font-medium uppercase tracking-wide text-zinc-500 backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-zinc-100", className)} {...props} />
  );
}

export function TH({
  className,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "h-9 px-3 py-2 font-medium",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "h-10 px-3 py-2 align-middle",
        align === "right" && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
