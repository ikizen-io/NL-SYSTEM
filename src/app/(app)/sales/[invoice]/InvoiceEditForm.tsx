"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CustomerFields, type CustomerOption } from "@/components/ui/customer-fields";
import { ActionStateBanner, FormFooter, FormSection } from "@/components/ui/form-patterns";
import { Input, Label, Textarea } from "@/components/ui/input";
import { formatLkr } from "@/lib/format";
import { safeInt } from "@/lib/forms";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateInvoice } from "./actions";

type EditableItem = {
  id?: string;
  sku: string;
  qty: number;
  unitPrice: number;
};

type InvoiceEditFormProps = {
  invoice: {
    invoiceNo: string;
    issuedDate: string;
    customerName: string;
    customerPhone: string;
    customerInstagram: string;
    customerAddress: string;
    shippingCharge: number;
    discountAmount: number;
    notes: string;
    status: string;
    items: EditableItem[];
  };
  skus: {
    sku: string;
    label: string;
    targetPrice: number | null;
    stock: number;
  }[];
  customers: CustomerOption[];
  paid: number;
  disabled?: boolean;
};

export function InvoiceEditForm({
  invoice,
  skus,
  customers,
  paid,
  disabled: disabledProp = false,
}: InvoiceEditFormProps) {
  const [state, formAction, pending] = useActionState(updateInvoice, {});
  const firstSku = skus[0];
  const [items, setItems] = useState<EditableItem[]>(
    invoice.items.length > 0
      ? invoice.items
      : [{ sku: firstSku?.sku ?? "", qty: 1, unitPrice: firstSku?.targetPrice ?? 0 }],
  );
  const [shippingCharge, setShippingCharge] = useState(invoice.shippingCharge);
  const [discountAmount, setDiscountAmount] = useState(invoice.discountAmount);
  const [customerName, setCustomerName] = useState(invoice.customerName);
  const [customerPhone, setCustomerPhone] = useState(invoice.customerPhone);
  const [customerInstagram, setCustomerInstagram] = useState(
    invoice.customerInstagram,
  );
  const [customerAddress, setCustomerAddress] = useState(invoice.customerAddress);
  const disabled = disabledProp || invoice.status === "CANCELLED" || invoice.status === "RETURNED";

  useEffect(() => {
    if (state.ok) toast.success("Invoice updated");
  }, [state.ok]);

  const skuOptions = useMemo(
    () =>
      skus.map((sku) => ({
        value: sku.sku,
        label: sku.label,
        description: `${sku.stock} available`,
      })),
    [skus],
  );

  const cleanedItems = useMemo(
    () =>
      items
        .map((item) => ({ ...item, sku: item.sku.trim() }))
        .filter((item) => item.sku.length > 0),
    [items],
  );

  const totals = useMemo(() => {
    const itemsTotal = items.reduce(
      (sum, item) => sum + (item.qty || 0) * (item.unitPrice || 0),
      0,
    );
    const grandTotal = Math.max(0, itemsTotal + shippingCharge - discountAmount);
    return { itemsTotal, grandTotal, balance: grandTotal - paid };
  }, [discountAmount, items, paid, shippingCharge]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="invoiceNo" value={invoice.invoiceNo} />
      <input type="hidden" name="items" value={JSON.stringify(cleanedItems)} />

      <ActionStateBanner error={state.error} />
      {disabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This invoice is voided. Restore it to issued before editing.
        </div>
      ) : null}

      <FormSection title="Customer and invoice">
      <div className="grid gap-3 md:grid-cols-6">
        <div className="md:col-span-1">
          <Label>Date</Label>
          <Input
            name="date"
            type="date"
            defaultValue={invoice.issuedDate}
            disabled={disabled}
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
          disabled={disabled}
          gridCols={6}
        />
        <div className="md:col-span-1">
          <Label>Shipping</Label>
          <Input
            name="shippingCharge"
            type="number"
            min={0}
            step={1}
            value={shippingCharge}
            onChange={(e) => setShippingCharge(safeInt(e.target.value, 0))}
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-1">
          <Label>Discount</Label>
          <Input
            name="discountAmount"
            type="number"
            min={0}
            step={1}
            value={discountAmount}
            onChange={(e) => setDiscountAmount(safeInt(e.target.value, 0))}
            disabled={disabled}
          />
        </div>
        <div className="md:col-span-1">
          <Label>Balance</Label>
          <div className="flex h-10 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold">
            {formatLkr(totals.balance)}
          </div>
        </div>
        <div className="md:col-span-3">
          <Label>Notes</Label>
          <Textarea
            name="notes"
            defaultValue={invoice.notes}
            disabled={disabled}
            className="min-h-9"
          />
        </div>
      </div>
      </FormSection>

      <FormSection title="Invoice items">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Invoice items
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || skus.length === 0}
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
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>

        <div className="overflow-auto rounded-xl border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2">SKU</th>
                <th className="px-4 py-2 text-right">Available</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit price</th>
                <th className="px-4 py-2 text-right">Line total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((item, idx) => (
                <tr key={`${item.id ?? "new"}-${idx}`} className="hover:bg-zinc-50">
                  <td className="px-4 py-2">
                    <Combobox
                      options={skuOptions}
                      value={item.sku}
                      onValueChange={(value) =>
                        setItems((prev) =>
                          prev.map((p, i) => {
                            if (i !== idx) return p;
                            const selected = skus.find((sku) => sku.sku === value);
                            return {
                              ...p,
                              sku: value,
                              unitPrice: selected?.targetPrice ?? p.unitPrice,
                            };
                          }),
                        )
                      }
                      className="h-9"
                      disabled={disabled}
                      placeholder="Select SKU"
                      searchPlaceholder="Search SKU, brand, model..."
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {skus.find((sku) => sku.sku === item.sku)?.stock ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input
                      value={item.qty}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, qty: safeInt(e.target.value, 1) } : p,
                          ),
                        )
                      }
                      type="number"
                      min={1}
                      step={1}
                      className="h-9 text-right"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Input
                      value={item.unitPrice}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? { ...p, unitPrice: safeInt(e.target.value, 0) }
                              : p,
                          ),
                        )
                      }
                      type="number"
                      min={0}
                      step={1}
                      className="h-9 text-right"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatLkr((item.qty || 0) * (item.unitPrice || 0))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || items.length === 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormSection>

      <FormFooter>
        <div className="grid gap-1 text-sm text-zinc-600">
          <div>Items: <span className="font-semibold text-zinc-950">{formatLkr(totals.itemsTotal)}</span></div>
          <div>Shipping: <span className="font-semibold text-zinc-950">{formatLkr(shippingCharge)}</span></div>
          <div>Discount: <span className="font-semibold text-zinc-950">{formatLkr(-discountAmount)}</span></div>
          <div>Grand total: <span className="font-semibold text-zinc-950">{formatLkr(totals.grandTotal)}</span></div>
          <div>Paid: <span className="font-semibold text-zinc-950">{formatLkr(paid)}</span></div>
        </div>
        <Button type="submit" disabled={pending || disabled}>
          {pending ? "Saving..." : "Save invoice"}
        </Button>
      </FormFooter>
    </form>
  );
}
