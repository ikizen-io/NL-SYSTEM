"use client";

import Link from "next/link";
import { useMemo } from "react";
import { customerSlug } from "@/lib/invoices";
import { Combobox } from "./combobox";
import { Input, Label } from "./input";

export type CustomerOption = {
  name: string;
  phone: string | null;
  instagramHandle: string | null;
  address: string | null;
};

export function CustomerFields({
  customers,
  customerName,
  customerPhone,
  customerInstagram,
  customerAddress,
  onCustomerNameChange,
  onCustomerPhoneChange,
  onCustomerInstagramChange,
  onCustomerAddressChange,
  disabled = false,
  gridCols = 12,
}: {
  customers: CustomerOption[];
  customerName: string;
  customerPhone: string;
  customerInstagram: string;
  customerAddress: string;
  onCustomerNameChange: (value: string) => void;
  onCustomerPhoneChange: (value: string) => void;
  onCustomerInstagramChange: (value: string) => void;
  onCustomerAddressChange: (value: string) => void;
  disabled?: boolean;
  gridCols?: 6 | 12;
}) {
  const customerOptions = useMemo(
    () =>
      customers.map((customer) => ({
        value: customer.name,
        label: customer.name,
        description: customer.phone ?? undefined,
      })),
    [customers],
  );

  const customersByName = useMemo(() => {
    const map = new Map<string, CustomerOption>();
    for (const customer of customers) {
      map.set(customer.name.toLowerCase(), customer);
    }
    return map;
  }, [customers]);

  const applyCustomer = (name: string) => {
    onCustomerNameChange(name);
    const match = customersByName.get(name.trim().toLowerCase());
    if (match) {
      onCustomerPhoneChange(match.phone ?? "");
      onCustomerInstagramChange(match.instagramHandle ?? "");
      onCustomerAddressChange(match.address ?? "");
    }
  };

  return (
    <>
      {customers.length > 0 ? (
        <div className={gridCols === 6 ? "md:col-span-3" : "md:col-span-4"}>
          <Label>Saved customer</Label>
          <Combobox
            options={customerOptions}
            value={
              customers.some((customer) => customer.name === customerName)
                ? customerName
                : ""
            }
            onValueChange={applyCustomer}
            placeholder="Search saved customer..."
            searchPlaceholder="Search name or phone..."
            emptyText="No saved customer found."
            disabled={disabled}
          />
        </div>
      ) : null}
      <div
        className={
          gridCols === 6
            ? customers.length > 0
              ? "md:col-span-3"
              : "md:col-span-2"
            : customers.length > 0
              ? "md:col-span-3"
              : "md:col-span-4"
        }
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <Label>Customer name</Label>
          {customers.some((customer) => customer.name === customerName) ? (
            <Link
              href={`/customers/${customerSlug(customerName)}`}
              className="text-[11px] font-medium text-zinc-500 hover:text-zinc-950"
            >
              View profile
            </Link>
          ) : null}
        </div>
        <Input
          name="customerName"
          value={customerName}
          onChange={(event) => onCustomerNameChange(event.target.value)}
          placeholder="Customer name"
          required
          disabled={disabled}
        />
      </div>
      <div className={gridCols === 6 ? "md:col-span-2" : "md:col-span-3"}>
        <Label>Phone</Label>
        <Input
          name="customerPhone"
          value={customerPhone}
          onChange={(event) => onCustomerPhoneChange(event.target.value)}
          placeholder="07x xxx xxxx"
          disabled={disabled}
        />
      </div>
      <div className={gridCols === 6 ? "md:col-span-2" : "md:col-span-3"}>
        <Label>Instagram</Label>
        <Input
          name="customerInstagram"
          value={customerInstagram}
          onChange={(event) => onCustomerInstagramChange(event.target.value)}
          placeholder="@handle"
          disabled={disabled}
        />
      </div>
      <div className={gridCols === 6 ? "md:col-span-6" : "md:col-span-12"}>
        <Label>Delivery address</Label>
        <Input
          name="customerAddress"
          value={customerAddress}
          onChange={(event) => onCustomerAddressChange(event.target.value)}
          placeholder="Street, city, postal code"
          disabled={disabled}
        />
      </div>
    </>
  );
}
