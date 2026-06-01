"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { formatLkr } from "@/lib/format";
import { toast } from "sonner";
import { updateSku } from "../../actions";

export function EditSkuForm({
  variant,
  brands,
  categories,
  effectiveCost,
  latestStockIn,
}: {
  variant: {
    sku: string;
    sizeLabel: string;
    color: string | null;
    targetPrice: number | null;
    product: {
      brand: string;
      category: string;
      modelName: string;
    };
  };
  brands: string[];
  categories: string[];
  effectiveCost: number;
  latestStockIn: {
    id: string;
    unitCost: number;
    extraCost: number | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(updateSku, {});

  const allBrands = brands.includes(variant.product.brand)
    ? brands
    : [...brands, variant.product.brand];
  const allCategories = categories.includes(variant.product.category)
    ? categories
    : [...categories, variant.product.category];

  const [brand, setBrand] = useState(variant.product.brand);
  const [category, setCategory] = useState(variant.product.category);

  useEffect(() => {
    if (state.ok) toast.success("SKU updated");
  }, [state.ok]);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="sku" value={variant.sku} />
      <ActionStateBanner error={state.error} />

      <div>
        <Label>Brand</Label>
        <input type="hidden" name="brand" value={brand} />
        <CreatableCombobox
          options={allBrands}
          value={brand}
          onValueChange={setBrand}
          placeholder="Select or type brand…"
          searchPlaceholder="Search brands…"
          createPrefix="Add brand"
        />
      </div>

      <div>
        <Label>Category</Label>
        <input type="hidden" name="category" value={category} />
        <CreatableCombobox
          options={allCategories}
          value={category}
          onValueChange={setCategory}
          placeholder="Select or type category…"
          searchPlaceholder="Search categories…"
          createPrefix="Add category"
        />
      </div>

      <div className="md:col-span-2">
        <Label>Product model</Label>
        <Input
          name="modelName"
          defaultValue={variant.product.modelName}
          required
        />
      </div>
      <div>
        <Label>Size</Label>
        <Input name="sizeLabel" defaultValue={variant.sizeLabel} required />
      </div>
      <div>
        <Label>Color / variant</Label>
        <Input name="color" defaultValue={variant.color ?? ""} />
      </div>
      <div>
        <Label>Target price (LKR)</Label>
        <Input
          name="targetPrice"
          type="number"
          min={1}
          step={1}
          defaultValue={variant.targetPrice ?? ""}
        />
      </div>

      {latestStockIn ? (
        <>
          <input type="hidden" name="latestStockInId" value={latestStockIn.id} />
          <div>
            <Label>Latest unit cost (LKR)</Label>
            <Input
              name="latestUnitCost"
              type="number"
              min={1}
              step={1}
              defaultValue={latestStockIn.unitCost}
            />
          </div>
          <div>
            <Label>Latest extra cost (LKR)</Label>
            <Input
              name="latestExtraCost"
              type="number"
              min={0}
              step={1}
              defaultValue={latestStockIn.extraCost ?? 0}
            />
            <div className="mt-1 text-xs text-zinc-500">
              Current effective unit cost: {formatLkr(effectiveCost)}
            </div>
          </div>
        </>
      ) : (
        <Alert tone="warning" className="md:col-span-2">
          No stock-in recorded yet. Unit cost is set when receiving stock.
        </Alert>
      )}

      <div className="md:col-span-2">
        <Button className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
