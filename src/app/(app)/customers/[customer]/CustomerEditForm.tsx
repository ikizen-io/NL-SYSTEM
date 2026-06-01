"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionStateBanner, FormSection } from "@/components/ui/form-patterns";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "sonner";
import { updateCustomer } from "../actions";

export function CustomerEditForm({
  customer,
}: {
  customer: {
    name: string;
    phone: string | null;
    instagramHandle: string | null;
    address: string | null;
    notes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateCustomer, {});
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [instagramHandle, setInstagramHandle] = useState(
    customer.instagramHandle ?? "",
  );
  const [address, setAddress] = useState(customer.address ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");

  useEffect(() => {
    if (state.ok) toast.success("Customer updated");
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="name" value={customer.name} />
      <ActionStateBanner error={state.error} />

      <FormSection title="Contact">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={customer.name} disabled />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="07x xxx xxxx"
            />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input
              name="instagramHandle"
              value={instagramHandle}
              onChange={(event) => setInstagramHandle(event.target.value)}
              placeholder="@handle"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Delivery address</Label>
            <Input
              name="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Street, city, postal code"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              name="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Sizing preferences, team orders, etc."
              className="min-h-20"
            />
          </div>
        </div>
      </FormSection>

      <div className="flex justify-end">
        <Button disabled={pending}>{pending ? "Saving..." : "Save customer"}</Button>
      </div>
    </form>
  );
}
