"use client";

import { useMemo, useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  ActionStateBanner,
  FormFooter,
  FormSection,
} from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatLkr } from "@/lib/format";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { processReturn, type ReturnActionState } from "./actions";

type ReturnLine = {
  invoiceItemId: string;
  sku: string;
  label: string;
  soldQty: number;
  availableQty: number;
  unitPrice: number;
};

type ExchangeLine = {
  sku: string;
  qty: number;
  unitPrice: number;
};

type SaleSku = {
  sku: string;
  label: string;
  targetPrice: number | null;
  stock: number;
};

export function ReturnExchangeForm({
  invoiceNo,
  invoiceSlug,
  disabled,
  lines,
  skus,
  balance,
}: {
  invoiceNo: string;
  invoiceSlug: string;
  disabled: boolean;
  lines: ReturnLine[];
  skus: SaleSku[];
  paid: number;
  balance: number;
}) {
  const [returnLines, setReturnLines] = useState<
    (ReturnLine & { returnQty: number; restock: boolean })[]
  >(() =>
    lines.map((line) => ({
      ...line,
      returnQty: 0,
      restock: true,
    })),
  );
  const [exchangeLines, setExchangeLines] = useState<ExchangeLine[]>([]);
  const [refundAmount, setRefundAmount] = useState("");
  const [state, formAction, pending] = useActionState<ReturnActionState, FormData>(
    async (prevState: ReturnActionState, formData: FormData) => {
      const result = await processReturn(prevState, formData);
      if (result.ok) {
        toast.success("Return processed");
        setReturnLines(
          lines.map((line) => ({
            ...line,
            returnQty: 0,
            restock: true,
          })),
        );
        setExchangeLines([]);
        setRefundAmount("");
      }
      return result;
    },
    {},
  );

  const activeReturns = returnLines.filter((line) => line.returnQty > 0);

  const skuOptions = useMemo(
    () =>
      skus.map((sku) => ({
        value: sku.sku,
        label: `${sku.label} (${sku.stock} in stock)`,
      })),
    [skus],
  );

  const parsedRefund = Number(refundAmount);
  const refundValue =
    refundAmount.trim() === "" || !Number.isFinite(parsedRefund)
      ? 0
      : Math.max(0, parsedRefund);

  const suggestedRefund = balance < 0 ? Math.abs(balance) : 0;

  if (disabled) {
    return (
      <p className="text-sm text-zinc-500">
        Returns can only be processed on issued invoices.
      </p>
    );
  }

  if (lines.every((line) => line.availableQty <= 0)) {
    return (
      <p className="text-sm text-zinc-500">
        All line items on this invoice have already been returned.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <ActionStateBanner error={state.error} />
      <input type="hidden" name="invoiceNo" value={invoiceSlug} />
      <input
        type="hidden"
        name="returns"
        value={JSON.stringify(
          activeReturns.map((line) => ({
            invoiceItemId: line.invoiceItemId,
            qty: line.returnQty,
            restock: line.restock,
          })),
        )}
      />
      <input
        type="hidden"
        name="exchanges"
        value={JSON.stringify(
          exchangeLines.filter((line) => line.sku && line.qty > 0),
        )}
      />

      <FormSection title="Return lines">
        <div className="space-y-3">
          {returnLines.map((line) => (
            <div
              key={line.invoiceItemId}
              className="rounded-xl border border-zinc-200 bg-white p-3"
            >
              <div className="mb-2 text-sm font-medium text-zinc-900">
                {line.sku} — {line.label}
              </div>
              <div className="mb-2 text-xs text-zinc-500">
                Sold {line.soldQty} at {formatLkr(line.unitPrice)} •{" "}
                {line.availableQty} still returnable
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Return qty</Label>
                  <Input
                    type="number"
                    min={0}
                    max={line.availableQty}
                    step={1}
                    value={line.returnQty || ""}
                    disabled={line.availableQty <= 0}
                    onChange={(event) => {
                      const next = Math.min(
                        line.availableQty,
                        Math.max(0, Number(event.target.value) || 0),
                      );
                      setReturnLines((rows) =>
                        rows.map((row) =>
                          row.invoiceItemId === line.invoiceItemId
                            ? { ...row, returnQty: next }
                            : row,
                        ),
                      );
                    }}
                  />
                </div>
                <div className="md:col-span-2 md:self-end">
                  <label className="flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={line.restock}
                      disabled={line.availableQty <= 0}
                      onChange={(event) => {
                        setReturnLines((rows) =>
                          rows.map((row) =>
                            row.invoiceItemId === line.invoiceItemId
                              ? { ...row, restock: event.target.checked }
                              : row,
                          ),
                        );
                      }}
                    />
                    Restock returned units
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Exchange (optional)">
        <p className="mb-3 text-xs text-zinc-500">
          Add replacement SKUs to this invoice — useful for size or color swaps.
        </p>
        <div className="space-y-3">
          {exchangeLines.map((line, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 md:grid-cols-12"
            >
              <div className="md:col-span-5">
                <Label>SKU</Label>
                <Combobox
                  options={skuOptions}
                  value={line.sku}
                  onValueChange={(value) => {
                    const sku = skus.find((entry) => entry.sku === value);
                    setExchangeLines((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index
                          ? {
                              ...row,
                              sku: value,
                              unitPrice: sku?.targetPrice ?? row.unitPrice,
                            }
                          : row,
                      ),
                    );
                  }}
                  placeholder="Search SKU..."
                />
              </div>
              <div className="md:col-span-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={line.qty || ""}
                  onChange={(event) => {
                    const qty = Math.max(1, Number(event.target.value) || 1);
                    setExchangeLines((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, qty } : row,
                      ),
                    );
                  }}
                />
              </div>
              <div className="md:col-span-3">
                <Label>Unit price</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={line.unitPrice || ""}
                  onChange={(event) => {
                    const unitPrice = Math.max(
                      0,
                      Number(event.target.value) || 0,
                    );
                    setExchangeLines((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, unitPrice } : row,
                      ),
                    );
                  }}
                />
              </div>
              <div className="flex items-end md:col-span-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExchangeLines((rows) =>
                      rows.filter((_, rowIndex) => rowIndex !== index),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setExchangeLines((rows) => [
                ...rows,
                { sku: "", qty: 1, unitPrice: 0 },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Add exchange line
          </Button>
        </div>
      </FormSection>

      <FormSection title="Refund (optional)">
        <div className="grid gap-3 md:grid-cols-4">
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
            <Label>Refund amount</Label>
            <Input
              name="refundAmount"
              type="number"
              min={0}
              step={1}
              value={refundAmount}
              placeholder={suggestedRefund > 0 ? String(suggestedRefund) : "0"}
              onChange={(event) => setRefundAmount(event.target.value)}
            />
          </div>
          <div>
            <Label>Method</Label>
            <Select name="refundMethod" defaultValue="CASH">
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Reference</Label>
            <Input name="refundReference" placeholder="Optional" />
          </div>
        </div>
        <div className="mt-2">
          <Label>Notes</Label>
          <Input name="notes" placeholder="Reason, condition, etc." />
        </div>
        {suggestedRefund > 0 ? (
          <p className="mt-2 text-xs text-amber-700">
            Customer may be owed up to {formatLkr(suggestedRefund)} based on
            current balance ({formatLkr(balance)}).
          </p>
        ) : null}
        {refundValue > 0 ? (
          <p className="mt-1 text-xs text-zinc-500">
            Refund of {formatLkr(refundValue)} will be recorded on this return
            for audit. Adjust payments separately if you paid cash back.
          </p>
        ) : null}
      </FormSection>

      <FormFooter>
        <Button type="submit" disabled={pending || activeReturns.length === 0}>
          {pending ? "Processing..." : "Process return"}
        </Button>
        <span className="text-xs text-zinc-500">
          {invoiceNo} • returning {activeReturns.length} line
          {activeReturns.length === 1 ? "" : "s"}
        </span>
      </FormFooter>
    </form>
  );
}
