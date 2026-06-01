"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ActionStateBanner, FormFooter, FormSection } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { safeInt } from "@/lib/forms";
import { toast } from "sonner";
import { setStockCount, type ActionState } from "../actions";

type VariantOption = {
  sku: string;
  label: string;
  stock: number;
};

export function StockAdjustForm({ variants }: { variants: VariantOption[] }) {
  const [sku, setSku] = useState(variants[0]?.sku ?? "");
  const [countedQty, setCountedQty] = useState("");

  const resetCounted = useCallback(() => setCountedQty(""), []);

  const [state, formAction, pending] = useActionState(
    async (prevState: ActionState, formData: FormData) => {
      const result = await setStockCount(prevState, formData);
      if (result.ok) {
        toast.success("Stock adjusted");
        resetCounted();
      }
      return result;
    },
    {},
  );

  const selected = variants.find((variant) => variant.sku === sku);
  const counted = countedQty === "" ? null : safeInt(countedQty, 0);
  const delta = selected && counted !== null ? counted - selected.stock : null;

  const options = useMemo(
    () =>
      variants.map((variant) => ({
        value: variant.sku,
        label: variant.label,
        description: `${variant.stock} now`,
      })),
    [variants],
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="sku" value={sku} />
      <ActionStateBanner error={state.error} />

      <FormSection title="Count result">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>SKU</Label>
            <Combobox
              options={options}
              value={sku}
              onValueChange={setSku}
              placeholder="Select SKU"
              searchPlaceholder="Search SKU, brand, model..."
              emptyText="No active SKUs found."
              disabled={variants.length === 0}
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              name="date"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>
          <div>
            <Label>Counted stock</Label>
            <Input
              name="countedQty"
              type="number"
              min={0}
              step={1}
              value={countedQty}
              onChange={(event) => setCountedQty(event.target.value)}
              required
            />
          </div>
          <div>
            <Label>Reason</Label>
            <Select name="reason" defaultValue="Stock count correction">
              <option>Stock count correction</option>
              <option>Damaged item</option>
              <option>Lost item</option>
              <option>Found stock</option>
              <option>Other correction</option>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Input name="notes" placeholder="Optional" />
          </div>
        </div>
      </FormSection>

      <FormFooter>
        <div className="text-sm text-zinc-600">
          Current{" "}
          <span className="font-semibold text-zinc-950">
            {selected?.stock ?? 0}
          </span>
          {" → "}Counted{" "}
          <span className="font-semibold text-zinc-950">
            {counted ?? "—"}
          </span>
          {delta !== null ? (
            <>
              {" · "}Delta{" "}
              <span className={delta < 0 ? "font-semibold text-red-700" : "font-semibold text-emerald-700"}>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </>
          ) : null}
        </div>
        <Button disabled={pending || variants.length === 0}>
          {pending ? "Applying..." : "Apply adjustment"}
        </Button>
      </FormFooter>
    </form>
  );
}
