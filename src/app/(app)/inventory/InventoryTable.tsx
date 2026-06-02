"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { formatLkr, formatPct } from "@/lib/format";
import type { InventoryRow } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { removeSku, restoreSku } from "./actions";
import { RestoreButton } from "@/components/ui/restore-button";

export function InventoryTable({
  rows,
  showArchived,
}: {
  rows: InventoryRow[];
  showArchived: boolean;
}) {
  const [query, setQuery] = useState("");

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.sku,
        row.brand,
        row.category,
        row.modelName,
        row.sizeLabel,
        row.color ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesText = haystack.includes(normalized);
      const matchesLowStock =
        normalized.includes("low") && row.active && row.currentStock <= 1;
      return matchesText || matchesLowStock;
    });
  }, [query, rows]);

  return (
    <>
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search SKU, brand, model, or type low for low stock..."
          className="max-w-md"
        />
      </div>
      <div className="overflow-auto">
        <Table>
          <THead>
            <tr>
              <TH>SKU</TH>
              <TH>Product</TH>
              <TH>Variant</TH>
              <TH align="right">Cost</TH>
              <TH align="right">Target</TH>
              <TH align="right">Margin</TH>
              <TH align="right">Sold</TH>
              <TH align="right">Stock</TH>
              <TH align="right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {filteredRows.length === 0 ? (
              <tr>
                <TD className="py-6 text-zinc-500" colSpan={9}>
                  {rows.length === 0
                    ? showArchived
                      ? "No SKUs found."
                      : "No active SKUs yet. Use Receive purchase to add stock, or Add SKU to set one up."
                    : "No SKUs match your search."}
                </TD>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const margin =
                  row.targetPrice && row.unitCost > 0
                    ? (row.targetPrice - row.unitCost) / row.targetPrice
                    : 0;
                const reorder = row.currentStock <= 1;
                return (
                  <tr key={row.sku} className="hover:bg-zinc-50">
                    <TD className="whitespace-nowrap font-mono text-[12px] text-zinc-700">
                      {row.sku}
                    </TD>
                    <TD className="max-w-[260px]">
                      <div className="truncate font-medium text-zinc-950">
                        {row.modelName}
                      </div>
                      <div className="truncate text-[11px] text-zinc-500">
                        {row.brand} • {row.category}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-zinc-700">
                      {row.sizeLabel}
                      {row.color ? (
                        <span className="text-zinc-400"> • {row.color}</span>
                      ) : null}
                    </TD>
                    <TD align="right" className="whitespace-nowrap">
                      {formatLkr(row.unitCost)}
                    </TD>
                    <TD align="right" className="whitespace-nowrap">
                      {row.targetPrice ? formatLkr(row.targetPrice) : "—"}
                    </TD>
                    <TD align="right" className="whitespace-nowrap text-zinc-600">
                      {row.targetPrice ? formatPct(margin) : "—"}
                    </TD>
                    <TD align="right" className="text-zinc-600">
                      {row.soldQty}
                    </TD>
                    <TD align="right">
                      {!row.active ? (
                        <Badge tone="neutral">Archived</Badge>
                      ) : (
                        <Badge tone={reorder ? "warning" : "success"}>
                          {row.currentStock} {reorder ? "low" : ""}
                        </Badge>
                      )}
                    </TD>
                    <TD align="right">
                      {row.active ? (
                        <div className="flex justify-end gap-1">
                          <Link prefetch={false}
                            href={`/inventory/${encodeURIComponent(row.sku)}/edit`}
                            title="Edit"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                          <ConfirmActionForm
                            action={removeSku}
                            fields={{ sku: row.sku }}
                            title={`Remove ${row.sku}?`}
                            description={
                              row.hasHistory
                                ? "This SKU has stock or sales history and will be archived, not deleted."
                                : "This SKU has no history and will be deleted permanently."
                            }
                            confirmLabel={row.hasHistory ? "Archive SKU" : "Delete SKU"}
                            successMessage={
                              row.hasHistory ? "SKU archived" : "SKU removed"
                            }
                            trigger={
                              <button
                                type="button"
                                title="Remove"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                        </div>
                      ) : (
                        <RestoreButton
                          action={restoreSku}
                          fields={{ sku: row.sku }}
                          successMessage="SKU restored"
                        />
                      )}
                    </TD>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
      </div>
    </>
  );
}
