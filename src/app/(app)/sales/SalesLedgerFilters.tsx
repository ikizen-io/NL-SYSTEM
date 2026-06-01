import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
  if (values.payMethod && values.payMethod !== "all") {
    params.set("payMethod", values.payMethod);
  }
  if (values.brand) params.set("brand", values.brand);
  if (values.category) params.set("category", values.category);
  if (values.page && values.page !== "1") params.set("page", values.page);
  return params.toString();
}

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
  const hasActiveFilter =
    values.q ||
    values.from ||
    values.to ||
    (values.status && values.status !== "all") ||
    values.customer ||
    (values.payMethod && values.payMethod !== "all") ||
    values.brand ||
    values.category;

  return (
    <form className="flex flex-wrap items-end gap-2">
      <div>
        <Label className="text-[11px]">Search</Label>
        <Input
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Invoice or customer"
          className="h-9 w-44"
        />
      </div>
      <div>
        <Label className="text-[11px]">From</Label>
        <Input
          name="from"
          type="date"
          defaultValue={values.from ?? ""}
          className="h-9"
        />
      </div>
      <div>
        <Label className="text-[11px]">To</Label>
        <Input name="to" type="date" defaultValue={values.to ?? ""} className="h-9" />
      </div>
      <div>
        <Label className="text-[11px]">Status</Label>
        <Select name="status" defaultValue={values.status ?? "all"} className="h-9">
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="ISSUED">Issued (any balance)</option>
          <option value="CANCELLED">Void</option>
          <option value="RETURNED">Returned</option>
        </Select>
      </div>
      <div>
        <Label className="text-[11px]">Customer</Label>
        <Select name="customer" defaultValue={values.customer ?? ""} className="h-9">
          <option value="">All customers</option>
          {customers.map((customer) => (
            <option key={customer.name} value={customer.name}>
              {customer.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label className="text-[11px]">Brand</Label>
        <Select name="brand" defaultValue={values.brand ?? ""} className="h-9">
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label className="text-[11px]">Category</Label>
        <Select name="category" defaultValue={values.category ?? ""} className="h-9">
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label className="text-[11px]">Payment method</Label>
        <Select name="payMethod" defaultValue={values.payMethod ?? "all"} className="h-9">
          <option value="all">Any</option>
          <option value="BANK">Bank</option>
          <option value="CASH">Cash</option>
          <option value="TRANSFER">Transfer</option>
          <option value="COD">COD</option>
          <option value="OTHER">Other</option>
        </Select>
      </div>
      <Button type="submit" size="sm">
        Filter
      </Button>
      {hasActiveFilter ? (
        <Button asChild variant="outline" size="sm">
          <Link href="/sales">Clear</Link>
        </Button>
      ) : null}
    </form>
  );
}
