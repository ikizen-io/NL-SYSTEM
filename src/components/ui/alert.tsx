import * as React from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type AlertTone = "success" | "danger" | "warning" | "info";

const toneStyles: Record<AlertTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  danger: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  info: "border-blue-200 bg-blue-50 text-blue-950",
};

const icons = {
  success: CheckCircle2,
  danger: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

export function Alert({
  tone = "info",
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement> & { tone?: AlertTone }) {
  const Icon = icons[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        toneStyles[tone],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
