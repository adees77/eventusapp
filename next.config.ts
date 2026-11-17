import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
