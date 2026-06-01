"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "border-zinc-200 bg-white text-zinc-950 shadow-[var(--shadow-elevated)]",
          description: "text-zinc-500",
          actionButton: "bg-zinc-950 text-white",
          cancelButton: "bg-zinc-100 text-zinc-950",
        },
      }}
    />
  );
}
