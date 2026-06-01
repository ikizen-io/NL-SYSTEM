import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "./alert";
import { cn } from "@/lib/cn";

export function ActionStateBanner({ error }: { error?: string }) {
  if (error) return <Alert tone="danger">{error}</Alert>;
  return null;
}

export function FormSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </div>
        {description ? (
          <div className="mt-0.5 text-xs text-zinc-500">{description}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function FormFooter({
  children,
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-4 -mb-4 mt-4 flex flex-col gap-3 border-t border-zinc-100 bg-white/90 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SuccessHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {children}
    </div>
  );
}
