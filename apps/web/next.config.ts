import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

// Enable Cloudflare bindings (R2, KV) during `next dev` so local dev
// matches production semantics. No-op in non-dev builds.
initOpenNextCloudflareForDev()

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // resvg-js + satori ship native + WASM binaries that webpack can't
  // bundle. Mark them as Node externals so they load via require() at
  // runtime instead.
  serverExternalPackages: ['@resvg/resvg-js', 'satori'],
  transpilePackages: ['@framework/db', '@framework/renderer', '@framework/types'],
  // Cloudflare R2 + Cloudflare Images origin (set per environment)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'imagedelivery.net' },
      { protocol: 'https', hostname: 'cdn.frame-work.app' },
    ],
  },
  // Subdomain routing handled in middleware.ts
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
