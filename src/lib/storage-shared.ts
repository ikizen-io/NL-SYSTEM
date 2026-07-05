/**
 * Constants shared between the server-only Supabase Storage client
 * (`storage.ts`) and client components that need to validate a photo before
 * submitting it. Keep this file free of server-only code (no `process.env`
 * secrets, no `fetch` calls) since it's safe to import from "use client" code.
 */
// Vercel hard-caps serverless function request bodies at 4.5 MB, regardless
// of the Next.js serverActions.bodySizeLimit config (see next.config.ts).
// Photos are submitted as part of a multipart form together with the rest of
// the SKU fields, so stay comfortably under that ceiling.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // 4 MB
export const ACCEPTED_PHOTO_TYPES = "image/png,image/jpeg,image/webp,image/gif";
