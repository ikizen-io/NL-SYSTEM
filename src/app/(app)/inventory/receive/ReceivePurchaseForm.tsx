"use client";

import { useActionState, useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ActionStateBanner, FormFooter, FormSection } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { formatLkr } from "@/lib/format";
import { safeInt } from "@/lib/forms";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { receivePurchase } from "../actions";

type ExistingSku = {
  sku: string;
  label: string;
  targetPrice: number | null;
  stock: number;
};

type Supplier = { id: string; name: string };

type ExistingLine = {
  mode: "existing";
  sku: string;
  qty: number;
  unitCost: number;
};

type NewLine = {
  mode: "new";
  brand: string;
  category: string;
  modelName: string;
  sizeLabel: string;
  color: string;
  sku: string;
  targetPrice: number;
  qty: number;
  unitCost: number;
};

type Line = ExistingLine | NewLine;

function makeExistingLine(skus: ExistingSku[]): ExistingLine {
  const first = skus[0];
  return {
    mode: "existing",
    sku: first?.sku ?? "",
    qty: 1,
    unitCost: 0,
  };
}

function makeNewLine(brands: string[], categories: string[]): NewLine {
  return {
    mode: "new",
    brand: brands[0] ?? "",
    category: categories[0] ?? "",
    modelName: "",
    sizeLabel: "",
    color: "",
    sku: "",
    targetPrice: 0,
    qty: 1,
    unitCost: 0,
  };
}

function cleanLines(lines: Line[]) {
  return lines.map((line) => {
    if (line.mode === "existing") {
      return {
        mode: "existing" as const,
        sku: line.sku.trim(),
        qty: line.qty,
        unitCost: line.unitCost,
      };
    }
    return {
      mode: "new" as const,
      brand: line.brand.trim(),
      category: line.category.trim(),
      modelName: line.modelName.trim(),
      sizeLabel: line.sizeLabel.trim(),
      color: line.color.trim() || null,
      sku: line.sku.trim() || undefined,
      targetPrice: line.targetPrice > 0 ? line.targetPrice : null,
      qty: line.qty,
      unitCost: line.unitCost,
    };
  });
}

export function ReceivePurchaseForm({
  skus,
  suppliers,
  brands,
  categories,
}: {
  skus: ExistingSku[];
  suppliers: Supplier[];
  brands: string[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(receivePurchase, {});
  const [supplierId, setSupplierId] = useState<string>(
    suppliers[0]?.id ?? "__NEW__",
  );
  const [extraCost, setExtraCost] = useState(0);
  const initialLine: Line =
    skus.length > 0 ? makeExistingLine(skus) : makeNewLine(brands, categories);
  const [lines, setLines] = useState<Line[]>([initialLine]);

  useEffect(() => {
    if (state.ok) toast.success("Purchase saved");
  }, [state.ok]);

  const totals = useMemo(() => {
    const lineTotal = lines.reduce(
      (sum, line) => sum + (line.qty || 0) * (line.unitCost || 0),
      0,
    );
    return {
      lineTotal,
      batchTotal: lineTotal + (extraCost || 0),
    };
  }, [extraCost, lines]);

  const supplierOptions = useMemo(
    () => [
      ...suppliers.map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
      { value: "__NEW__", label: "+ Add new supplier" },
    ],
    [suppliers],
  );

  const updateLine = (index: number, updater: (line: Line) => Line) => {
    setLines((prev) => prev.map((line, i) => (i === index ? updater(line) : line)));
  };

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lines" value={JSON.stringify(cleanLines(lines))} />

      <ActionStateBanner error={state.error} />

      <FormSection title="Purchase details">
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label>Date received</Label>
          <Input
            name="receivedDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
        <div>
          <Label>Supplier</Label>
          <input type="hidden" name="supplierId" value={supplierId} />
          <Combobox
            options={supplierOptions}
            value={supplierId}
            onValueChange={setSupplierId}
            placeholder="Select supplier"
            searchPlaceholder="Search supplier..."
          />
          {supplierId === "__NEW__" ? (
            <div className="mt-2">
              <Input
                name="supplierCustom"
                placeholder="Supplier name"
                required
              />
            </div>
          ) : null}
        </div>
        <div>
          <Label>Purchase reference</Label>
          <Input
            name="purchaseRef"
            placeholder="Supplier invoice / order #"
          />
        </div>
        <div>
          <Label>Extra cost (LKR)</Label>
          <Input
            name="extraCost"
            type="number"
            min={0}
            step={1}
            value={extraCost}
            onChange={(event) => setExtraCost(safeInt(event.target.value, 0))}
            placeholder="Shipping / fees"
          />
          <div className="mt-1 text-xs text-zinc-500">
            Split across lines by line value.
          </div>
        </div>
        <div className="md:col-span-4">
          <Label>Notes</Label>
          <Input name="notes" placeholder="Optional notes for this purchase" />
        </div>
      </div>
      </FormSection>

      <FormSection title="Items received" description="Use existing SKU for restocks, or create a new SKU inline when the item is new.">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Items received
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={skus.length === 0}
              onClick={() => setLines((prev) => [...prev, makeExistingLine(skus)])}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add existing SKU
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                setLines((prev) => [...prev, makeNewLine(brands, categories)])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add new product
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => (
            <LineRow
              key={index}
              line={line}
              skus={skus}
              brands={brands}
              categories={categories}
              canRemove={lines.length > 1}
              onChange={(next) => updateLine(index, () => next)}
              onSwitchMode={(mode) =>
                updateLine(index, () =>
                  mode === "existing"
                    ? makeExistingLine(skus)
                    : makeNewLine(brands, categories),
                )
              }
              onRemove={() =>
                setLines((prev) => prev.filter((_, i) => i !== index))
              }
            />
          ))}
        </div>
      </FormSection>

      <FormFooter>
        <div className="grid gap-1 text-sm text-zinc-600">
          <div>
            Items total:{" "}
            <span className="font-semibold text-zinc-950">
              {formatLkr(totals.lineTotal)}
            </span>
          </div>
          <div>
            Extra cost:{" "}
            <span className="font-semibold text-zinc-950">
              {formatLkr(extraCost)}
            </span>
          </div>
          <div>
            Batch total:{" "}
            <span className="font-semibold text-zinc-950">
              {formatLkr(totals.batchTotal)}
            </span>
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save purchase"}
        </Button>
      </FormFooter>
    </form>
  );
}

function LineRow({
  line,
  skus,
  brands,
  categories,
  canRemove,
  onChange,
  onSwitchMode,
  onRemove,
}: {
  line: Line;
  skus: ExistingSku[];
  brands: string[];
  categories: string[];
  canRemove: boolean;
  onChange: (next: Line) => void;
  onSwitchMode: (mode: "existing" | "new") => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs font-medium">
          <button
            type="button"
            className={
              line.mode === "existing"
                ? "rounded-md bg-white px-3 py-1 text-zinc-950 shadow-sm"
                : "rounded-md px-3 py-1 text-zinc-500 hover:text-zinc-950"
            }
            onClick={() => onSwitchMode("existing")}
            disabled={skus.length === 0}
          >
            Existing SKU
          </button>
          <button
            type="button"
            className={
              line.mode === "new"
                ? "rounded-md bg-white px-3 py-1 text-zinc-950 shadow-sm"
                : "rounded-md px-3 py-1 text-zinc-500 hover:text-zinc-950"
            }
            onClick={() => onSwitchMode("new")}
          >
            New product
          </button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!canRemove}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {line.mode === "existing" ? (
        <ExistingLineFields line={line} skus={skus} onChange={onChange} />
      ) : (
        <NewLineFields
          line={line}
          brands={brands}
          categories={categories}
          onChange={onChange}
        />
      )}
    </div>
  );
}

function ExistingLineFields({
  line,
  skus,
  onChange,
}: {
  line: ExistingLine;
  skus: ExistingSku[];
  onChange: (next: ExistingLine) => void;
}) {
  return (
    <div className="grid items-end gap-3 md:grid-cols-12">
      <div className="md:col-span-6">
        <Label>SKU</Label>
        <Combobox
          options={skus.map((sku) => ({
            value: sku.sku,
            label: sku.label,
            description: `${sku.stock} in stock`,
          }))}
          value={line.sku}
          onValueChange={(value) => onChange({ ...line, sku: value })}
          placeholder="Select SKU"
          searchPlaceholder="Search SKU, brand, model..."
          emptyText="No active SKUs yet."
        />
      </div>
      <div className="md:col-span-2">
        <Label>Qty</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={line.qty}
          onChange={(event) =>
            onChange({ ...line, qty: safeInt(event.target.value, 1) })
          }
        />
      </div>
      <div className="md:col-span-3">
        <Label>Unit cost (LKR)</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={line.unitCost}
          onChange={(event) =>
            onChange({ ...line, unitCost: safeInt(event.target.value, 0) })
          }
        />
      </div>
      <div className="md:col-span-1 text-right text-sm text-zinc-600">
        {formatLkr((line.qty || 0) * (line.unitCost || 0))}
      </div>
    </div>
  );
}

function NewLineFields({
  line,
  brands,
  categories,
  onChange,
}: {
  line: NewLine;
  brands: string[];
  categories: string[];
  onChange: (next: NewLine) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      <div>
        <Label>Brand</Label>
        <CreatableCombobox
          options={brands}
          value={line.brand}
          onValueChange={(value) => onChange({ ...line, brand: value })}
          placeholder="Select or type brand…"
          searchPlaceholder="Search brands…"
          createPrefix="Add brand"
        />
      </div>
      <div>
        <Label>Category</Label>
        <CreatableCombobox
          options={categories}
          value={line.category}
          onValueChange={(value) => onChange({ ...line, category: value })}
          placeholder="Select or type category…"
          searchPlaceholder="Search categories…"
          createPrefix="Add category"
        />
      </div>
      <div className="md:col-span-2">
        <Label>Product model</Label>
        <Input
          placeholder="e.g. Future 7 Match FG"
          value={line.modelName}
          onChange={(event) =>
            onChange({ ...line, modelName: event.target.value })
          }
        />
      </div>
      <div>
        <Label>Size</Label>
        <Input
          placeholder="e.g. UK 9"
          value={line.sizeLabel}
          onChange={(event) =>
            onChange({ ...line, sizeLabel: event.target.value })
          }
        />
      </div>
      <div>
        <Label>Color</Label>
        <Input
          placeholder="optional"
          value={line.color}
          onChange={(event) => onChange({ ...line, color: event.target.value })}
        />
      </div>
      <div>
        <Label>SKU code</Label>
        <Input
          placeholder="auto"
          value={line.sku}
          onChange={(event) => onChange({ ...line, sku: event.target.value })}
        />
        <div className="mt-1 text-[11px] text-zinc-500">
          Leave blank to auto-generate
        </div>
      </div>
      <div>
        <Label>Target price (LKR)</Label>
        <Input
          type="number"
          min={0}
          step={1}
          value={line.targetPrice}
          onChange={(event) =>
            onChange({
              ...line,
              targetPrice: safeInt(event.target.value, 0),
            })
          }
        />
      </div>
      <div>
        <Label>Qty</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={line.qty}
          onChange={(event) =>
            onChange({ ...line, qty: safeInt(event.target.value, 1) })
          }
        />
      </div>
      <div>
        <Label>Unit cost (LKR)</Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={line.unitCost}
          onChange={(event) =>
            onChange({ ...line, unitCost: safeInt(event.target.value, 0) })
          }
        />
      </div>
      <div className="md:col-span-2 text-right text-sm text-zinc-600 self-end">
        Line total:{" "}
        <span className="font-semibold text-zinc-950">
          {formatLkr((line.qty || 0) * (line.unitCost || 0))}
        </span>
      </div>
    </div>
  );
}
