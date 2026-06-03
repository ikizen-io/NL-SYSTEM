import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { paymentMethodOptions } from "@/lib/payment-methods";
import { X } from "lucide-react";

export type SalesFilterValues = {
  q?: string;
  from?: string;
  to?: string;
  status?: string;
  customer?: string;
  payMethod?: string;
  brand?: string;
  category?: string;
  page?: string;
};

export function salesFilterQuery(values: SalesFilterValues) {
  const params = new URLSearchParams();
  if (values.q) params.set("q", values.q);
  if (values.from) params.set("from", values.from);
  if (values.to) params.set("to", values.to);
  if (values.status && values.status !== "all") params.set("status", values.status);
  if (values.customer) params.set("customer", values.customer);
  if (values.payMethod && values.payMethod !== "all") params.set("payMethod", values.payMethod);
  if (values.brand) params.set("brand", values.brand);
  if (values.category) params.set("category", values.category);
  if (values.page && values.page !== "1") params.set("page", values.page);
  return params.toString();
}

const STATUS_PILLS = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "ISSUED", label: "Issued" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Void" },
] as const;

export function SalesLedgerFilters({
  values,
  customers,
  brands,
  categories,
}: {
  values: SalesFilterValues;
  customers: { name: string }[];
  brands: string[];
  categories: string[];
}) {
  const activeStatus = values.status || "all";

  const activeFilterCount = [
    values.q,
    values.from,
    values.to,
    values.customer,
    values.brand,
    values.category,
    values.payMethod && values.payMethod !== "all" ? values.payMethod : null,
  ].filter(Boolean).length;

  const hasActiveFilter =
    activeFilterCount > 0 || (activeStatus && activeStatus !== "all");

  return (
    <div className="border-b border-zinc-100">
      {/* Status quick-filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-2">
        {STATUS_PILLS.map((pill) => {
          const isActive = activeStatus === pill.value;
          const href =
            pill.value === "all"
              ? "/sales"
              : `/sales?${salesFilterQuery({ ...values, status: pill.value, page: "1" })}`;
          return (
            <Link
              key={pill.value}
              prefetch={false}
              href={href}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-zinc-950 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900",
              )}
            >
              {pill.label}
            </Link>
          );
        })}
      </div>

      {/* Detailed filter form */}
      <form className="px-4 pb-3 space-y-2">
        <input type="hidden" name="status" value={activeStatus} />

        {/* Row 1: search + dates */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1" style={{ minWidth: "160px", maxWidth: "260px" }}>
            <Label className="text-[11px]">Search</Label>
            <Input
              name="q"
              defaultValue={values.q ?? ""}
              placeholder="Invoice # or customer name"
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[11px]">From</Label>
            <Input
              name="from"
              type="date"
              defaultValue={values.from ?? ""}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[11px]">To</Label>
            <Input
              name="to"
              type="date"
              defaultValue={values.to ?? ""}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Row 2: dimension filters + actions */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-40">
            <Label className="text-[11px]">Customer</Label>
            <Select
              name="customer"
              defaultValue={values.customer ?? ""}
              className="h-8 text-sm"
            >
              <option value="">All customers</option>
              {customers.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <Label className="text-[11px]">Brand</Label>
            <Select
              name="brand"
              defaultValue={values.brand ?? ""}
              className="h-8 text-sm"
            >
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-[11px]">Category</Label>
            <Select
              name="category"
              defaultValue={values.category ?? ""}
              className="h-8 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-36">
            <Label className="text-[11px]">Payment method</Label>
            <Select
              name="payMethod"
              defaultValue={values.payMethod ?? "all"}
              className="h-8 text-sm"
            >
              <option value="all">Any method</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-end gap-1.5">
            <Button type="submit" size="sm" className="h-8">
              Apply
            </Button>
            {hasActiveFilter ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1">
                <Link prefetch={false} href="/sales">
                  <X className="h-3.5 w-3.5" />
                  Clear
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-zinc-700">
                      {activeFilterCount}
                    </span>
                  )}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );
}
