import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Preset = {
  label: string;
  start: string;
  end: string;
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildPresets(now = new Date()): Preset[] {
  const today = isoDate(now);
  const d7 = new Date(now);
  d7.setUTCDate(d7.getUTCDate() - 6);
  const d30 = new Date(now);
  d30.setUTCDate(d30.getUTCDate() - 29);
  const d90 = new Date(now);
  d90.setUTCDate(d90.getUTCDate() - 89);
  const d365 = new Date(now);
  d365.setUTCDate(d365.getUTCDate() - 364);
  const fyStart =
    now.getUTCMonth() >= 3
      ? new Date(Date.UTC(now.getUTCFullYear(), 3, 1))
      : new Date(Date.UTC(now.getUTCFullYear() - 1, 3, 1));

  return [
    { label: "Today", start: today, end: today },
    { label: "Last 7 days", start: isoDate(d7), end: today },
    { label: "Last 30 days", start: isoDate(d30), end: today },
    { label: "Last 90 days", start: isoDate(d90), end: today },
    { label: "Last 365 days", start: isoDate(d365), end: today },
    { label: "This FY", start: isoDate(fyStart), end: today },
  ];
}

export function DashboardPresets({
  activeStart,
  activeEnd,
}: {
  activeStart?: string;
  activeEnd?: string;
}) {
  const presets = buildPresets();

  return (
    <div className="flex flex-wrap gap-1.5">
      {presets.map((preset) => {
        const active =
          activeStart === preset.start && activeEnd === preset.end;
        const href = `/dashboard?${new URLSearchParams({
          mode: "range",
          start: preset.start,
          end: preset.end,
        }).toString()}`;
        return (
          <Button
            key={preset.label}
            asChild
            size="sm"
            variant={active ? "primary" : "outline"}
            className={cn(active && "pointer-events-none")}
          >
            <Link href={href}>{preset.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}
