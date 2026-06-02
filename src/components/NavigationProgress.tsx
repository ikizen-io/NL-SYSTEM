"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), 450);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-200",
        active ? "opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      <div
        className={cn(
          "h-full w-1/3 bg-zinc-950",
          active && "animate-[nav-progress_0.45s_ease-out_forwards]",
        )}
      />
    </div>
  );
}
