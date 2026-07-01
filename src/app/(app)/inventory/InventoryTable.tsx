"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { formatLkr, formatPct } from "@/lib/format";
import type { InventoryRow } from "@/lib/inventory";
import { Badge } from "@/components/ui/badge";
import { ConfirmActionForm } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { removeSku, restoreSku } from "./actions";
import { RestoreButton } from "@/components/ui/restore-button";
import { cn } from "@/lib/cn";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type SortKey =
  | "default"
  | "stock-asc"
  | "stock-desc"
  | "margin-desc"
  | "sold-desc"
  | "cost-desc"
  | "cost-asc";

export function InventoryTable({
  rows,
  showArchived,
}: {
  rows: InventoryRow[];
  showArchived: boolean;
}) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const brands = useMemo(
    () => [...new Set(rows.map((r) => r.brand))].sort(),
    [rows],
  );
  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category))].sort(),
    [rows],
  );

  const hasActiveFilter =
    query.trim() !== "" ||
    stockFilter !== "all" ||
    brandFilter !== "" ||
    categoryFilter !== "" ||
    sortKey !== "default";

  const filteredRows = useMemo(() => {
    let result = rows;

    // text search
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((row) =>
        [row.sku, row.brand, row.category, row.modelName, row.sizeLabel, row.color ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    // stock level filter
    if (stockFilter === "in-stock") {
      result = result.filter((r) => r.active && r.currentStock > 1);
    } else if (stockFilter === "low-stock") {
      result = result.filter((r) => r.active && r.currentStock === 1);
    } else if (stockFilter === "out-of-stock") {
      result = result.filter((r) => r.active && r.currentStock <= 0);
    }

    // brand filter
    if (brandFilter) {
      result = result.filter((r) => r.brand === brandFilter);
    }

    // category filter
    if (categoryFilter) {
      result = result.filter((r) => r.category === categoryFilter);
    }

    // sort
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "stock-asc":
          return a.currentStock - b.currentStock;
        case "stock-desc":
          return b.currentStock - a.currentStock;
        case "margin-desc": {
          const mA =
            a.targetPrice && a.unitCost > 0
              ? (a.targetPrice - a.unitCost) / a.targetPrice
              : -1;
          const mB =
            b.targetPrice && b.unitCost > 0
              ? (b.targetPrice - b.unitCost) / b.targetPrice
              : -1;
          return mB - mA;
        }
        case "sold-desc":
          return b.soldQty - a.soldQty;
        case "cost-desc":
          return b.unitCost - a.unitCost;
        case "cost-asc":
          return a.unitCost - b.unitCost;
        default:
          return a.brand.localeCompare(b.brand) || a.sku.localeCompare(b.sku);
      }
    });

    return result;
  }, [query, stockFilter, brandFilter, categoryFilter, sortKey, rows]);

  function clearFilters() {
    setQuery("");
    setStockFilter("all");
    setBrandFilter("");
    setCategoryFilter("");
    setSortKey("default");
  }

  return (
    <>
      {/* Filter bar */}
      <div className="border-b border-zinc-100 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, brand, model…"
            className="h-8 w-56 text-sm"
          />

          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="h-8 text-sm w-44"
          >
            <option value="all">All stock levels</option>
            <option value="in-stock">In stock (&gt;1)</option>
            <option value="low-stock">Low stock (= 1)</option>
            <option value="out-of-stock">Out of stock</option>
          </Select>

          <Select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="h-8 text-sm w-36"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 text-sm w-40"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>

          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-8 text-sm w-44"
          >
            <option value="default">Sort: Brand / SKU</option>
            <option value="stock-desc">Sort: Stock high → low</option>
            <option value="stock-asc">Sort: Stock low → high</option>
            <option value="margin-desc">Sort: Margin high → low</option>
            <option value="sold-desc">Sort: Sold high → low</option>
            <option value="cost-desc">Sort: Cost high → low</option>
            <option value="cost-asc">Sort: Cost low → high</option>
          </Select>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex h-8 items-center gap-1 rounded-md px-2.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        <div className="text-[11px] text-zinc-400">
          {filteredRows.length === rows.length
            ? `${rows.length} SKU${rows.length === 1 ? "" : "s"}`
            : `${filteredRows.length} of ${rows.length} SKUs`}
        </div>
      </div>

      {/* Table */}
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
                <TD className="py-8 text-zinc-500" colSpan={9}>
                  {rows.length === 0 ? (
                    showArchived ? (
                      "No SKUs found."
                    ) : (
                      "No active SKUs yet. Use Receive purchase to add stock, or Add SKU to set one up."
                    )
                  ) : (
                    <span>
                      No SKUs match your filters.{" "}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="underline hover:text-zinc-700"
                      >
                        Clear filters
                      </button>
                    </span>
                  )}
                </TD>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const margin =
                  row.targetPrice && row.unitCost > 0
                    ? (row.targetPrice - row.unitCost) / row.targetPrice
                    : 0;
                const outOfStock = row.active && row.currentStock <= 0;
                const lowStock = row.active && row.currentStock === 1;
                return (
                  <tr
                    key={row.sku}
                    className={cn(
                      "hover:bg-zinc-50",
                      outOfStock && "opacity-60",
                    )}
                  >
                    <TD className="whitespace-nowrap font-mono text-[12px] text-zinc-700">
                      {row.sku}
                    </TD>
                    <TD className="max-w-[260px]">
                      <div className="flex items-center gap-2">
                        {row.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.imageUrl}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded-md border border-zinc-200 object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-zinc-950">
                            {row.modelName}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">
                            {row.brand} • {row.category}
                          </div>
                        </div>
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
                    <TD
                      align="right"
                      className={cn(
                        "whitespace-nowrap",
                        margin >= 0.4
                          ? "text-emerald-700"
                          : margin >= 0.25
                            ? "text-zinc-600"
                            : "text-rose-600",
                      )}
                    >
                      {row.targetPrice ? formatPct(margin) : "—"}
                    </TD>
                    <TD align="right" className="text-zinc-600">
                      {row.soldQty}
                    </TD>
                    <TD align="right">
                      {!row.active ? (
                        <Badge tone="neutral">Archived</Badge>
                      ) : outOfStock ? (
                        <Badge tone="danger">0 out</Badge>
                      ) : (
                        <Badge tone={lowStock ? "warning" : "success"}>
                          {row.currentStock}
                          {lowStock ? " low" : ""}
                        </Badge>
                      )}
                    </TD>
                    <TD align="right">
                      {row.active ? (
                        <div className="flex justify-end gap-1">
                          <Link
                            prefetch={false}
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
                            successMessage={row.hasHistory ? "SKU archived" : "SKU removed"}
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
