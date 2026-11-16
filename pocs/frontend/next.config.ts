import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false, // keeps screenshots clean for draft comparison
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
