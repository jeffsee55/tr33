import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Cache Components (includes `"use cache"` in app source). @see https://nextjs.org/docs/app/api-reference/directives/use-cache */
  cacheComponents: true,
};

export default nextConfig;
