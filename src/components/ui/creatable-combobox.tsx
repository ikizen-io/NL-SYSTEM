"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/cn";

/**
 * A combobox that lets the user pick from existing options or type a new value.
 * When the typed query doesn't match any existing option a "Create '<query>'"
 * row appears; selecting it calls onValueChange with the typed string directly —
 * no __NEW__ sentinel, no secondary input.
 */
export function CreatableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select or type…",
  searchPlaceholder = "Search…",
  createPrefix = "Create",
  disabled = false,
  className,
}: {
  options: string[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  createPrefix?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const normalise = (s: string) => s.trim().toLowerCase();
  const filtered = query
    ? options.filter((o) => normalise(o).includes(normalise(query)))
    : options;

  const exactMatch = options.some((o) => normalise(o) === normalise(query.trim()));
  const canCreate = query.trim().length > 0 && !exactMatch;

  function handleSelect(val: string) {
    onValueChange(val);
    setQuery("");
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between px-3 font-normal", className)}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !canCreate ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : null}
            {filtered.length > 0 ? (
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === option ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            {canCreate ? (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query.trim()}`}
                  onSelect={() => handleSelect(query.trim())}
                  className="text-zinc-600"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span>
                    {createPrefix}{" "}
                    <span className="font-medium text-zinc-900">
                      &ldquo;{query.trim()}&rdquo;
                    </span>
                  </span>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
