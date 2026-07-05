import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // SKU photo uploads go through the create/update SKU server actions as
      // multipart form data. The default 1MB limit rejects any real photo
      // (surfaces to the user as a generic "unexpected response" error page).
      // Capped at 4.5mb to match Vercel's own hard request-body limit for
      // serverless functions, which can't be raised beyond that regardless
      // of this setting. src/lib/storage-shared.ts keeps the actual accepted
      // photo size safely under this so real uploads don't get right up
      // against the ceiling.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
