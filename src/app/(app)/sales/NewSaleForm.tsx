"use client";

import { useActionState, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Alert } from "@/components/ui/alert";
import { CustomerFields } from "@/components/ui/customer-fields";
import { ActionStateBanner, FormFooter, FormSection } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatLkr } from "@/lib/format";
import { safeInt } from "@/lib/forms";
import { cn } from "@/lib/cn";
import { Plus, Trash2, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { createSale, type SaleActionState } from "./actions";

type Item = { sku: string; qty: number; unitPrice: number };
type SaleSku = {
  sku: string;
  label: string;
  targetPrice: number | null;
  stock: number;
};
type CustomerOption = {
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  address: string | null;
};

export function NewSaleForm({
  skus,
  allSkus,
  customers,
}: {
  skus: SaleSku[];       // in-stock only
  allSkus: SaleSku[];    // all active SKUs (for pre-order mode)
  customers: CustomerOption[];
}) {
  const [preOrder, setPreOrder] = useState(false);
  const activeSkus = preOrder ? allSkus : skus;
  const firstSku = activeSkus[0];

  const [items, setItems] = useState<Item[]>([
    { sku: firstSku?.sku ?? "", qty: 1, unitPrice: firstSku?.targetPrice ?? 0 },
  ]);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerInstagram, setCustomerInstagram] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const resetForm = useCallback(() => {
    const first = (preOrder ? allSkus : skus)[0];
    setItems([{ sku: first?.sku ?? "", qty: 1, unitPrice: first?.targetPrice ?? 0 }]);
    setShippingCharge(0);
    setDiscountAmount(0);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerInstagram("");
    setCustomerAddress("");
    setPreOrder(false);
  }, [preOrder, allSkus, skus]);

  const [state, formAction, pending] = useActionState(
    async (prevState: SaleActionState, formData: FormData) => {
      const result = await createSale(prevState, formData);
      if (result.ok) {
        toast.success("Invoice created");
        resetForm();
      }
      return result;
    },
    {},
  );

  const cleanedItems = useMemo(
    () =>
      items
        .map((i) => ({ ...i, sku: i.sku.trim() }))
        .filter((i) => i.sku.length > 0),
    [items],
  );

  const totals = useMemo(() => {
    const itemTotal = items.reduce(
      (s, it) => s + (it.qty || 0) * (it.unitPrice || 0),
      0,
    );
    return {
      itemTotal,
      grandTotal: Math.max(0, itemTotal + shippingCharge - discountAmount),
    };
  }, [items, shippingCharge, discountAmount]);

  const skuOptions = useMemo(
    () =>
      activeSkus.map((sku) => ({
        value: sku.sku,
        label: sku.label,
        description: sku.stock > 0 ? `${sku.stock} in stock` : "Out of stock",
      })),
    [activeSkus],
  );

  const oversoldLines = useMemo(
    () =>
      items.filter((item) => {
        if (!item.sku.trim() || preOrder) return false;
        const stock = skus.find((sku) => sku.sku === item.sku)?.stock ?? 0;
        return item.qty > stock;
      }),
    [items, skus, preOrder],
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>New sale</CardTitle>
          <div className="text-[11px] text-zinc-500">
            Search a saved customer or enter a new one below.
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Pre-order toggle */}
          <button
            type="button"
            onClick={() => setPreOrder((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              preOrder
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700",
            )}
            title="Allow creating invoices for items not yet in stock"
          >
            <PackageSearch className="h-3.5 w-3.5" />
            Pre-order
          </button>
          <div className="text-xs text-zinc-500">
            Grand total:{" "}
            <span className="font-semibold text-zinc-950">
              {formatLkr(totals.grandTotal)}
            </span>
          </div>
        </div>
      </CardHeader>

      <form action={formAction} className="space-y-4 p-4">
        <input type="hidden" name="items" value={JSON.stringify(cleanedItems)} />
        <input type="hidden" name="preOrder" value={preOrder ? "true" : "false"} />

        <ActionStateBanner error={state.error} />

        {preOrder && (
          <Alert tone="info">
            <strong>Pre-order mode</strong> — you can invoice any active SKU regardless of current
            stock. Use this when the customer is paying an advance for items you will source.
            Stock will go negative until you receive the purchase.
          </Alert>
        )}

        {!preOrder && oversoldLines.length > 0 && (
          <Alert tone="warning">
            {oversoldLines.length === 1
              ? "One line exceeds available stock. The server will reject the sale if stock is insufficient."
              : `${oversoldLines.length} lines exceed available stock. The server will reject the sale if stock is insufficient.`}
          </Alert>
        )}

        <FormSection title="Customer">
          <div className="grid gap-3 md:grid-cols-12">
            <div className="md:col-span-2">
              <Label>Date</Label>
              <Input
                name="date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <CustomerFields
              customers={customers}
              customerName={customerName}
              customerPhone={customerPhone}
              customerInstagram={customerInstagram}
              customerAddress={customerAddress}
              onCustomerNameChange={setCustomerName}
              onCustomerPhoneChange={setCustomerPhone}
              onCustomerInstagramChange={setCustomerInstagram}
              onCustomerAddressChange={setCustomerAddress}
            />
          </div>
        </FormSection>

        <FormSection title="Items" description="Search SKUs, confirm quantity, and adjust price if needed.">
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Items
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={activeSkus.length === 0}
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    sku: firstSku?.sku ?? "",
                    qty: 1,
                    unitPrice: firstSku?.targetPrice ?? 0,
                  },
                ])
              }
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>
          <table className="min-w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left font-medium">SKU</th>
                <th className="w-20 px-3 py-2 text-right font-medium">Stock</th>
                <th className="w-20 px-3 py-2 text-right font-medium">Qty</th>
                <th className="w-32 px-3 py-2 text-right font-medium">
                  Unit price
                </th>
                <th className="w-32 px-3 py-2 text-right font-medium">
                  Line total
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((it, idx) => {
                const stock = skus.find((s) => s.sku === it.sku)?.stock ?? 0;
                const oversold = it.sku.trim() && it.qty > stock;
                return (
                <tr
                  key={idx}
                  className={oversold ? "bg-amber-50/70 hover:bg-amber-50" : "hover:bg-zinc-50"}
                >
                  <td className="px-3 py-1.5">
                    <Combobox
                      options={skuOptions}
                      value={it.sku}
                      onValueChange={(value) =>
                        setItems((prev) =>
                          prev.map((p, i) => {
                            if (i !== idx) return p;
                            const selected = activeSkus.find(
                              (s) => s.sku === value,
                            );
                            return {
                              ...p,
                              sku: value,
                              unitPrice: selected?.targetPrice ?? p.unitPrice,
                            };
                          }),
                        )
                      }
                      placeholder="Select SKU"
                      searchPlaceholder="Search SKU, brand, model..."
                      emptyText="No matching SKU found."
                      className="h-9"
                    />
                  </td>
                  <td className={cn(
                    "px-3 py-1.5 text-right tabular-nums",
                    stock === 0 ? "text-red-500" : "text-zinc-600",
                  )}>
                    {stock === 0 ? "0" : stock}
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={it.qty}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, qty: safeInt(e.target.value, 1) }
                              : p,
                          ),
                        )
                      }
                      type="number"
                      min={1}
                      step={1}
                      className={`h-9 text-right ${oversold ? "border-amber-300 bg-amber-50" : ""}`}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      value={it.unitPrice}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  unitPrice: safeInt(e.target.value, 0),
                                }
                              : p,
                          ),
                        )
                      }
                      type="number"
                      min={0}
                      step={1}
                      className="h-9 text-right"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                    {formatLkr((it.qty || 0) * (it.unitPrice || 0))}
                  </td>
                  <td className="pr-2 text-right">
                    <button
                      type="button"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
        </FormSection>

        <FormFooter>
          <div className="grid flex-1 gap-3 md:grid-cols-12 md:items-end">
          <div className="md:col-span-2">
            <Label>Shipping (LKR)</Label>
            <Input
              name="shippingCharge"
              type="number"
              min={0}
              step={1}
              value={shippingCharge}
              onChange={(e) => setShippingCharge(safeInt(e.target.value, 0))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Discount (LKR)</Label>
            <Input
              name="discountAmount"
              type="number"
              min={0}
              step={1}
              value={discountAmount}
              onChange={(e) => setDiscountAmount(safeInt(e.target.value, 0))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Payment method</Label>
            <Select name="paymentMethod" defaultValue="BANK">
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
              <option value="TRANSFER">Transfer</option>
              <option value="COD">COD</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Paid now (optional)</Label>
            <Input
              name="paymentAmount"
              type="number"
              min={0}
              step={1}
              placeholder="Advance / amount paid"
            />
          </div>
          <div className="md:col-span-3 flex flex-col gap-1.5 text-xs text-zinc-600 md:items-end md:text-right">
            <div>
              Items{" "}
              <span className="font-semibold text-zinc-950">
                {formatLkr(totals.itemTotal)}
              </span>{" "}
              · Ship{" "}
              <span className="font-semibold text-zinc-950">
                {formatLkr(shippingCharge)}
              </span>{" "}
              · Disc{" "}
              <span className="font-semibold text-zinc-950">
                -{formatLkr(discountAmount)}
              </span>
            </div>
            <Button
              type="submit"
              disabled={pending || activeSkus.length === 0}
              className={cn(
                "w-full md:w-auto",
                preOrder && "bg-blue-600 hover:bg-blue-700",
              )}
            >
              {pending
                ? "Creating..."
                : preOrder
                  ? `Create pre-order invoice • ${formatLkr(totals.grandTotal)}`
                  : `Create invoice • ${formatLkr(totals.grandTotal)}`}
            </Button>
          </div>
        </div>
        </FormFooter>
      </form>
    </Card>
  );
}
