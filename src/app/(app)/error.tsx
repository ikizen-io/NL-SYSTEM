"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Page, PageDescription, PageHeader, PageTitle } from "@/components/ui/page";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message =
    error.message?.includes("Can't reach database") ||
    error.message?.includes("connect")
      ? "Could not reach the database. Check your connection and Supabase status, then try again."
      : error.message?.trim() ||
        "Something went wrong while loading this page.";

  return (
    <Page>
      <PageHeader>
        <div>
          <PageTitle>Something went wrong</PageTitle>
          <PageDescription>
            The page could not be loaded. Your data was not changed.
          </PageDescription>
        </div>
      </PageHeader>

      <Alert tone="danger">{message}</Alert>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.assign("/dashboard")}>
          Go to dashboard
        </Button>
      </div>

      {error.digest ? (
        <p className="text-xs text-zinc-400">Reference: {error.digest}</p>
      ) : null}
    </Page>
  );
}
