/**
 * Constants shared between the server-only Supabase Storage client
 * (`storage.ts`) and client components that need to validate a photo before
 * submitting it. Keep this file free of server-only code (no `process.env`
 * secrets, no `fetch` calls) since it's safe to import from "use client" code.
 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_PHOTO_TYPES = "image/png,image/jpeg,image/webp,image/gif";
