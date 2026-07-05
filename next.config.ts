import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // SKU photo uploads go through the create/update SKU server actions as
      // multipart form data. The default 1MB limit rejects any real photo
      // (surfaces to the user as a generic "unexpected response" error page).
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
