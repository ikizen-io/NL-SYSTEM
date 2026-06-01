import { formatLkr } from "@/lib/format";
import { Table, TBody, TD, TH, THead } from "@/components/ui/table";

type ReturnRecordView = {
  id: string;
  date: string;
  notes: string;
  refundAmount: number;
  refundMethod: string | null;
  refundReference: string | null;
  items: {
    sku: string;
    label: string;
    qty: number;
    restock: boolean;
  }[];
  exchanges: {
    sku: string;
    label: string;
    qty: number;
    unitPrice: number;
  }[];
};

export function ReturnsHistory({ records }: { records: ReturnRecordView[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
        No returns recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-zinc-900">{record.date}</div>
            {record.refundAmount > 0 ? (
              <div className="text-sm text-zinc-700">
                Refund {formatLkr(record.refundAmount)}
                {record.refundMethod ? ` • ${record.refundMethod}` : ""}
              </div>
            ) : null}
          </div>
          {record.notes ? (
            <p className="mb-2 text-xs text-zinc-500">{record.notes}</p>
          ) : null}
          <div className="overflow-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Type</TH>
                  <TH>Item</TH>
                  <TH align="right">Qty</TH>
                  <TH align="right">Value</TH>
                </tr>
              </THead>
              <TBody>
                {record.items.map((item, index) => (
                  <tr key={`return-${record.id}-${index}`}>
                    <TD className="text-zinc-600">Return</TD>
                    <TD>
                      {item.sku} — {item.label}
                      {!item.restock ? " (not restocked)" : ""}
                    </TD>
                    <TD align="right">{item.qty}</TD>
                    <TD align="right">—</TD>
                  </tr>
                ))}
                {record.exchanges.map((item, index) => (
                  <tr key={`exchange-${record.id}-${index}`}>
                    <TD className="text-zinc-600">Exchange</TD>
                    <TD>
                      {item.sku} — {item.label}
                    </TD>
                    <TD align="right">{item.qty}</TD>
                    <TD align="right">{formatLkr(item.qty * item.unitPrice)}</TD>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}
