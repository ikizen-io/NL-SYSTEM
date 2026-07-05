"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { ActionStateBanner } from "@/components/ui/form-patterns";
import { Input, Label } from "@/components/ui/input";
import { formatLkr } from "@/lib/format";
import { toast } from "sonner";
import { updateSku } from "../../actions";
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/storage-shared";

const MAX_PHOTO_MB = Math.floor(MAX_PHOTO_BYTES / (1024 * 1024));

export function EditSkuForm({
  variant,
  brands,
  categories,
  effectiveCost,
  latestStockIn,
}: {
  variant: {
    sku: string;
    sizeLabel: string;
    color: string | null;
    targetPrice: number | null;
    imageUrl: string | null;
    product: {
      brand: string;
      category: string;
      modelName: string;
    };
  };
  brands: string[];
  categories: string[];
  effectiveCost: number;
  latestStockIn: {
    id: string;
    unitCost: number;
    extraCost: number | null;
  } | null;
}) {
  const [state, formAction, pending] = useActionState(updateSku, {});

  const allBrands = brands.includes(variant.product.brand)
    ? brands
    : [...brands, variant.product.brand];
  const allCategories = categories.includes(variant.product.category)
    ? categories
    : [...categories, variant.product.category];

  const [brand, setBrand] = useState(variant.product.brand);
  const [category, setCategory] = useState(variant.product.category);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("SKU updated");
  }, [state.ok]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file && file.size > MAX_PHOTO_BYTES) {
      toast.error(`Image must be ${MAX_PHOTO_MB} MB or smaller.`);
      event.target.value = "";
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveExistingPhoto(false);
  }

  function clearNewPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeExisting() {
    clearNewPhoto();
    setRemoveExistingPhoto(true);
  }

  const displayedPhoto = photoPreview ?? (removeExistingPhoto ? null : variant.imageUrl);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="sku" value={variant.sku} />
      <ActionStateBanner error={state.error} />

      <div>
        <Label>Brand</Label>
        <input type="hidden" name="brand" value={brand} />
        <CreatableCombobox
          options={allBrands}
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
          options={allCategories}
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
          defaultValue={variant.product.modelName}
          required
        />
      </div>
      <div>
        <Label>Size</Label>
        <Input name="sizeLabel" defaultValue={variant.sizeLabel} required />
      </div>
      <div>
        <Label>Color / variant</Label>
        <Input name="color" defaultValue={variant.color ?? ""} />
      </div>
      <div>
        <Label>Target price (LKR)</Label>
        <Input
          name="targetPrice"
          type="number"
          min={1}
          step={1}
          defaultValue={variant.targetPrice ?? ""}
        />
      </div>

      <div className="md:col-span-2">
        <Label>Photo</Label>
        <input type="hidden" name="removePhoto" value={removeExistingPhoto ? "true" : "false"} />
        <div className="flex items-center gap-3">
          {displayedPhoto ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayedPhoto} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={photoPreview ? clearNewPhoto : removeExisting}
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
            accept={ACCEPTED_PHOTO_TYPES}
            onChange={handlePhotoChange}
            className="max-w-xs"
          />
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          Optional. JPEG, PNG, WEBP, or GIF, up to {MAX_PHOTO_MB} MB.
        </div>
      </div>

      {latestStockIn ? (
        <>
          <input type="hidden" name="latestStockInId" value={latestStockIn.id} />
          <div>
            <Label>Latest unit cost (LKR)</Label>
            <Input
              name="latestUnitCost"
              type="number"
              min={1}
              step={1}
              defaultValue={latestStockIn.unitCost}
            />
          </div>
          <div>
            <Label>Latest extra cost (LKR)</Label>
            <Input
              name="latestExtraCost"
              type="number"
              min={0}
              step={1}
              defaultValue={latestStockIn.extraCost ?? 0}
            />
            <div className="mt-1 text-xs text-zinc-500">
              Current effective unit cost: {formatLkr(effectiveCost)}
            </div>
          </div>
        </>
      ) : (
        <Alert tone="warning" className="md:col-span-2">
          No stock-in recorded yet. Unit cost is set when receiving stock.
        </Alert>
      )}

      <div className="md:col-span-2">
        <Button className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
