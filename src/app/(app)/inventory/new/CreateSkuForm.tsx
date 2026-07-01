"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ActionStateBanner, FormFooter, FormSection } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";
import { createSku } from "../actions";

export function CreateSkuForm({
  brands,
  categories,
}: {
  brands: string[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(createSku, {});
  const [brand, setBrand] = useState<string>(brands[0] ?? "");
  const [category, setCategory] = useState<string>(categories[0] ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("SKU created");
  }, [state.ok]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <form action={formAction} className="space-y-4">
      <ActionStateBanner error={state.error} />
      <FormSection title="Product">
      <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Brand</Label>
        <input type="hidden" name="brand" value={brand} />
        <CreatableCombobox
          options={brands}
          value={brand}
          onValueChange={setBrand}
          placeholder="Select or type brand…"
          searchPlaceholder="Search brands…"
          createPrefix="Add brand"
        />
      </div>

      <div>
        <Label>Category</Label>
        <input type="hidden" name="category" value={category} />
        <CreatableCombobox
          options={categories}
          value={category}
          onValueChange={setCategory}
          placeholder="Select or type category…"
          searchPlaceholder="Search categories…"
          createPrefix="Add category"
        />
      </div>

      <div className="md:col-span-2">
        <Label>Product model</Label>
        <Input
          name="modelName"
          placeholder="e.g. Future 7 Match FG"
          required
        />
      </div>
      </div>
      </FormSection>

      <FormSection title="Variant">
      <div className="grid gap-3 md:grid-cols-2">
      <div>
        <Label>Size</Label>
        <Input name="sizeLabel" placeholder="e.g. UK 9 (28 cm)" required />
      </div>

      <div>
        <Label>Color / variant</Label>
        <Input name="color" placeholder="e.g. Apple Green, Blue/White" />
      </div>

      <div>
        <Label>SKU code</Label>
        <Input name="sku" placeholder="leave blank to auto-generate" />
        <div className="mt-1 text-[11px] text-zinc-500">
          Optional. Use your own short code or leave blank.
        </div>
      </div>

      <div>
        <Label>Target price (LKR)</Label>
        <Input name="targetPrice" type="number" placeholder="e.g. 22000" />
      </div>

      <div className="md:col-span-2">
        <Label>Photo</Label>
        <div className="flex items-center gap-3">
          {photoPreview ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400">
              <ImagePlus className="h-5 w-5" />
            </div>
          )}
          <Input
            ref={fileInputRef}
            name="photo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handlePhotoChange}
            className="max-w-xs"
          />
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          Optional. JPEG, PNG, WEBP, or GIF, up to 5 MB.
        </div>
      </div>
      </div>
      </FormSection>

      <FormFooter>
        <div className="text-xs text-zinc-500">
          Leave SKU blank to auto-generate from brand, model, size, and color.
        </div>
        <Button disabled={pending}>
          {pending ? "Saving..." : "Create SKU"}
        </Button>
      </FormFooter>
    </form>
  );
}
