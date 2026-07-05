/**
 * Minimal Supabase Storage client using the plain REST API via fetch.
 * Avoids adding @supabase/supabase-js as a dependency for what is just
 * two HTTP calls (upload + delete) against a single public bucket.
 */

import { MAX_PHOTO_BYTES } from "./storage-shared";

const BUCKET = "sku-photos";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function isImageUploadConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_STORAGE_KEY);
}

function storageConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_STORAGE_KEY;
  if (!url || !key) {
    throw new Error(
      "Image upload isn't configured. Set SUPABASE_URL and SUPABASE_STORAGE_KEY.",
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const fromType = file.type.split("/").pop();
  return fromType || "jpg";
}

export function publicSkuPhotoUrl(objectPath: string) {
  const { url } = storageConfig();
  return `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

/** Extracts the storage object path from a previously stored public URL. */
export function skuPhotoPathFromUrl(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.slice(index + marker.length);
}

export async function uploadSkuPhoto(file: File, sku: string): Promise<string> {
  const { url, key } = storageConfig();

  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Please upload a JPEG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error(
      `Image must be ${Math.floor(MAX_PHOTO_BYTES / (1024 * 1024))} MB or smaller.`,
    );
  }

  const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, "_");
  const objectPath = `${safeSku}/${Date.now()}.${extensionFor(file)}`;
  const bytes = await file.arrayBuffer();

  const res = await fetch(
    `${url}/storage/v1/object/${BUCKET}/${objectPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: bytes,
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Image upload failed (${res.status}). ${detail}`.trim());
  }

  return publicSkuPhotoUrl(objectPath);
}

export async function deleteSkuPhoto(publicUrl: string): Promise<void> {
  const objectPath = skuPhotoPathFromUrl(publicUrl);
  if (!objectPath) return;

  const { url, key } = storageConfig();
  await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
  }).catch(() => {
    // Best-effort cleanup; a stray object in storage isn't worth failing the request over.
  });
}
