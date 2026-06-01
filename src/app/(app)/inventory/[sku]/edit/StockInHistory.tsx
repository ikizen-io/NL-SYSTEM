import Link from "next/link";
import { effectiveUnitCost } from "@/lib/costing";
import { formatLkr } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

export function StockInHistory({
  sku,
  stockIns,
}: {
  sku: string;
  stockIns: {
    id: string;
    receivedDate: Date;
    qty: number;
    unitCost: number;
    extraCost: number | null;
    supplier: string | null;
    purchaseRef: string | null;
    notes: string | null;
    supplierRecord: { name: string } | null;
  }[];
}) {
  if (stockIns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock-in history</CardTitle>
        </CardHeader>
        <div className="px-4 pb-4 text-sm text-zinc-500">
          No stock received yet.{" "}
          <Link href="/inventory/receive" className="underline">
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
            </tr>
          </THead>
          <TBody>
            {stockIns.map((stockIn) => {
              const effective = effectiveUnitCost({
                qty: stockIn.qty,
                unitCost: stockIn.unitCost,
                extraCost: stockIn.extraCost,
              });
              return (
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
                </tr>
              );
            })}
          </TBody>
        </Table>
      </div>
    </Card>
  );
}
