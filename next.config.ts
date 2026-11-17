import type { NextConfig } from "next";

/**
 * Supabase project «eventus»: the URL and the publishable key are public (they ship to every browser,
 * RLS guards the data), so the deployed site gets them even without Vercel env vars. Env overrides.
 */
const SUPABASE_URL = "https://gtftnpvgdsfkpstdnolf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aygC0iyFw6-nY4A6X4CS4A_z4yKYpUF";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY,
  },
  // 127.0.0.1 has its own localStorage: a second, separately signed-in copy of the app next to localhost
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
