"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Users, Receipt, Boxes } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { GlobalSearchResults, SearchResult } from "@/lib/global-search";
import { cn } from "@/lib/cn";

const EMPTY_RESULTS: GlobalSearchResults = { customers: [], invoices: [], skus: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<GlobalSearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      return;
    }
  }, [open]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search failed");
        const data: GlobalSearchResults = await res.json();
        setResults(data);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults(EMPTY_RESULTS);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const totalResults =
    results.customers.length + results.invoices.length + results.skus.length;

  function handleSelect(result: SearchResult) {
    setOpen(false);
    router.push(result.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-[220px] items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Search...</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 p-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false} className="rounded-2xl">
            <CommandInput
              autoFocus
              wrapperClassName="pr-9"
              placeholder="Search customers, invoices, SKUs..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.trim() && !loading && totalResults === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : null}
              {!query.trim() ? (
                <div className="px-3 py-6 text-center text-sm text-zinc-500">
                  Type to search customers, invoices, and SKUs.
                </div>
              ) : null}
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </div>
              ) : null}

              {results.customers.length > 0 ? (
                <CommandGroup heading="Customers">
                  {results.customers.map((result) => (
                    <ResultItem key={result.id} result={result} icon={Users} onSelect={handleSelect} />
                  ))}
                </CommandGroup>
              ) : null}

              {results.invoices.length > 0 ? (
                <CommandGroup heading="Invoices">
                  {results.invoices.map((result) => (
                    <ResultItem key={result.id} result={result} icon={Receipt} onSelect={handleSelect} />
                  ))}
                </CommandGroup>
              ) : null}

              {results.skus.length > 0 ? (
                <CommandGroup heading="Inventory">
                  {results.skus.map((result) => (
                    <ResultItem key={result.id} result={result} icon={Boxes} onSelect={handleSelect} />
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultItem({
  result,
  icon: Icon,
  onSelect,
}: {
  result: SearchResult;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <CommandItem
      value={result.id}
      onSelect={() => onSelect(result)}
      className={cn("cursor-pointer")}
    >
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-zinc-900">{result.title}</span>
        <span className="truncate text-xs text-zinc-500">{result.subtitle}</span>
      </div>
    </CommandItem>
  );
}
