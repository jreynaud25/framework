import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import kvIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache'
import d1NextTagCache from '@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache'

/**
 * OpenNext Cloudflare adapter config.
 *
 * Deploys apps/web as a Cloudflare Worker (Pages-style) while keeping
 * Next 15 App Router + Node-runtime API routes (Stripe, Resend,
 * Anthropic SDK, Satori).
 *
 * Caching:
 *   - incrementalCache → Workers KV  (NEXT_INC_CACHE_KV binding)
 *   - tagCache         → D1          (NEXT_TAG_CACHE_D1 binding)
 *     so revalidateTag in /api/brand-tokens and /api/templates fans out
 *     across edges.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  tagCache: d1NextTagCache,
})
