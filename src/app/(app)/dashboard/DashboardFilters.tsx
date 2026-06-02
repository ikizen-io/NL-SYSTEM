"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type Preset = { label: string; start: string; end: string };

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildPresets(now = new Date()): Preset[] {
  const today = isoDate(now);
  const d7 = new Date(now); d7.setUTCDate(d7.getUTCDate() - 6);
  const d30 = new Date(now); d30.setUTCDate(d30.getUTCDate() - 29);
  const d90 = new Date(now); d90.setUTCDate(d90.getUTCDate() - 89);
  const d365 = new Date(now); d365.setUTCDate(d365.getUTCDate() - 364);
  const fyStart =
    now.getUTCMonth() >= 3
      ? new Date(Date.UTC(now.getUTCFullYear(), 3, 1))
      : new Date(Date.UTC(now.getUTCFullYear() - 1, 3, 1));
  return [
    { label: "Today",       start: today,         end: today },
    { label: "Last 7 days", start: isoDate(d7),   end: today },
    { label: "Last 30 days",start: isoDate(d30),  end: today },
    { label: "Last 90 days",start: isoDate(d90),  end: today },
    { label: "Last 365 days",start: isoDate(d365),end: today },
    { label: "This FY",     start: isoDate(fyStart), end: today },
  ];
}

export function DashboardFilters({
  mode,
  month,
  rangeStart,
  rangeEnd,
}: {
  mode: "month" | "range";
  month: string;
  rangeStart: string;
  rangeEnd: string;
}) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<"month" | "range">(mode);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [selectedStart, setSelectedStart] = useState(rangeStart);
  const [selectedEnd, setSelectedEnd] = useState(rangeEnd);

  const presets = buildPresets();
  const activePreset =
    mode === "range"
      ? presets.find((p) => p.start === rangeStart && p.end === rangeEnd)
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ mode: selectedMode });
    if (selectedMode === "month") {
      params.set("month", selectedMonth);
    } else {
      params.set("start", selectedStart);
      params.set("end", selectedEnd);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <div className="space-y-3 border-b border-zinc-100 px-4 py-3">
      {/* Quick preset pills — always visible */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Quick
        </span>
        {presets.map((preset) => {
          const isActive = activePreset?.label === preset.label;
          const href = `/dashboard?${new URLSearchParams({
            mode: "range",
            start: preset.start,
            end: preset.end,
          }).toString()}`;
          return (
            <Link
              key={preset.label}
              prefetch={false}
              href={href}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900",
              )}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      {/* Custom filter row */}
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        {/* Mode toggle */}
        <div className="flex overflow-hidden rounded-lg border border-zinc-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => setSelectedMode("month")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              selectedMode === "month"
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-500 hover:bg-zinc-50",
            )}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setSelectedMode("range")}
            className={cn(
              "px-3 py-1.5 transition-colors",
              selectedMode === "range"
                ? "bg-zinc-950 text-white"
                : "bg-white text-zinc-500 hover:bg-zinc-50",
            )}
          >
            Custom range
          </button>
        </div>

        {/* Month picker */}
        {selectedMode === "month" && (
          <div>
            <Label className="text-[11px]">Month</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        )}

        {/* Date range pickers */}
        {selectedMode === "range" && (
          <>
            <div>
              <Label className="text-[11px]">From</Label>
              <Input
                type="date"
                value={selectedStart}
                onChange={(e) => setSelectedStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px]">To</Label>
              <Input
                type="date"
                value={selectedEnd}
                onChange={(e) => setSelectedEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </>
        )}

        <Button type="submit" size="sm" className="h-8">
          View
        </Button>
      </form>
    </div>
  );
}
