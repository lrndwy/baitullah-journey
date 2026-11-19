import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Only a fallback. The browser-facing API origin is resolved at runtime from
  // `API_PUBLIC_URL` and injected into the page (see `lib/runtime-config.ts`),
  // so this value only applies to a container started with no configuration.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
}

export default nextConfig
