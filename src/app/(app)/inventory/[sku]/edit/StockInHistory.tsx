"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import { effectiveUnitCost } from "@/lib/costing";
import { formatLkr } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { toast } from "sonner";
import { updateStockIn } from "../../actions";

type StockInRow = {
  id: string;
  receivedDate: Date;
  qty: number;
  unitCost: number;
  extraCost: number | null;
  supplier: string | null;
  purchaseRef: string | null;
  notes: string | null;
  supplierRecord: { id: string; name: string } | null;
};

type Supplier = { id: string; name: string };

function EditStockInForm({
  sku,
  row,
  suppliers,
  onClose,
}: {
  sku: string;
  row: StockInRow;
  suppliers: Supplier[];
  onClose: () => void;
}) {
  const currentSupplierId = row.supplierRecord?.id ?? "";
  const [supplierId, setSupplierId] = useState(currentSupplierId);
  const [state, formAction, pending] = useActionState(updateStockIn, {});

  useEffect(() => {
    if (state.ok) {
      toast.success("Stock-in updated");
      onClose();
    }
  }, [state.ok, onClose]);

  const isNew = supplierId === "__NEW__";

  return (
    <tr>
      <td colSpan={8} className="bg-zinc-50 px-4 py-3">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="sku" value={sku} />

          <ActionStateBanner error={state.error} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <Label className="text-xs">Date received</Label>
              <Input
                name="receivedDate"
                type="date"
                defaultValue={row.receivedDate.toISOString().slice(0, 10)}
                className="h-8 text-sm"
                required
              />
            </div>

            <div className={isNew ? "lg:col-span-2" : ""}>
              <Label className="text-xs">Supplier</Label>
              <Select
                name="supplierId"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-8 text-sm"
              >
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value="__NEW__">+ Add new supplier…</option>
              </Select>
            </div>

            {isNew && (
              <div>
                <Label className="text-xs">New supplier name</Label>
                <Input
                  name="supplierCustom"
                  placeholder="Supplier name"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
            )}

            <div>
              <Label className="text-xs">Purchase ref</Label>
              <Input
                name="purchaseRef"
                defaultValue={row.purchaseRef ?? ""}
                placeholder="e.g. INV-001"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Unit cost (LKR)</Label>
              <Input
                name="unitCost"
                type="number"
                min={1}
                step={1}
                defaultValue={row.unitCost}
                className="h-8 text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-xs">Extra cost (LKR)</Label>
              <Input
                name="extraCost"
                type="number"
                min={0}
                step={1}
                defaultValue={row.extraCost ?? 0}
                className="h-8 text-sm"
              />
            </div>

            <div className="col-span-2 lg:col-span-4">
              <Label className="text-xs">Notes</Label>
              <Input
                name="notes"
                defaultValue={row.notes ?? ""}
                placeholder="Optional notes"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function StockInHistory({
  sku,
  stockIns,
  suppliers,
}: {
  sku: string;
  stockIns: StockInRow[];
  suppliers: Supplier[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (stockIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock-in history</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 text-sm text-zinc-500">
          No stock received yet.{" "}
          <Link prefetch={false} href="/inventory/receive" className="underline">
            Receive purchase
          </Link>{" "}
          to add stock for {sku}.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Stock-in history</CardTitle>
          <Link
            prefetch={false}
            href="/inventory/stock-ins"
            className="text-xs font-medium text-zinc-500 hover:text-zinc-950"
          >
            View all batches
          </Link>
        </div>
      </CardHeader>
      <div className="overflow-auto">
        <Table>
          <THead>
            <tr>
              <TH>Date</TH>
              <TH>Supplier</TH>
              <TH>Purchase ref</TH>
              <TH align="right">Qty</TH>
              <TH align="right">Unit cost</TH>
              <TH align="right">Extra</TH>
              <TH align="right">Effective</TH>
              <TH>Notes</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {stockIns.map((stockIn) => {
              const effective = effectiveUnitCost({
                qty: stockIn.qty,
                unitCost: stockIn.unitCost,
                extraCost: stockIn.extraCost,
              });
              const isEditing = editingId === stockIn.id;
              return (
                <>
                  <tr key={stockIn.id} className="hover:bg-zinc-50">
                    <TD className="whitespace-nowrap">
                      {stockIn.receivedDate.toISOString().slice(0, 10)}
                    </TD>
                    <TD>
                      {stockIn.supplierRecord?.name ?? stockIn.supplier ?? "—"}
                    </TD>
                    <TD className="text-zinc-600">{stockIn.purchaseRef ?? "—"}</TD>
                    <TD align="right">{stockIn.qty}</TD>
                    <TD align="right">{formatLkr(stockIn.unitCost)}</TD>
                    <TD align="right">
                      {stockIn.extraCost ? formatLkr(stockIn.extraCost) : "—"}
                    </TD>
                    <TD align="right">{formatLkr(effective)}</TD>
                    <TD className="max-w-[180px] truncate text-zinc-600">
                      {stockIn.notes ?? "—"}
                    </TD>
                    <TD align="right">
                      <button
                        type="button"
                        title={isEditing ? "Cancel edit" : "Edit this batch"}
                        onClick={() =>
                          setEditingId(isEditing ? null : stockIn.id)
                        }
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                      >
                        {isEditing ? (
                          <X className="h-3.5 w-3.5" />
                        ) : (
                          <Pencil className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </TD>
                  </tr>
                  {isEditing && (
                    <EditStockInForm
                      key={`edit-${stockIn.id}`}
                      sku={sku}
                      row={stockIn}
                      suppliers={suppliers}
                      onClose={() => setEditingId(null)}
                    />
                  )}
                </>
              );
            })}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}
