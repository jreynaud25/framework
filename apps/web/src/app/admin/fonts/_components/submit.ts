'use client'

interface GoogleInput {
  source: 'google'
  tokenKey: string
  familyName: string
  weights: number[]
}
interface AdobeInput {
  source: 'adobe'
  tokenKey: string
  familyName: string
  kitId: string
  projectId: string
}
interface SelfHostedInput {
  source: 'self_hosted'
  tokenKey: string
  familyName: string
  variants: Array<{
    weight: number
    style: 'normal' | 'italic'
    r2Key: string
    fileSize: number
    format: 'woff2' | 'woff' | 'ttf' | 'otf'
    fontFileHash: string
  }>
  attestation: { text: string; licensePdfR2Key?: string }
}

type Input = GoogleInput | AdobeInput | SelfHostedInput

export async function submitFont(
  input: Input,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/fonts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...input,
      // brand slug resolved server-side via auth context — placeholder for the
      // first call; the API extracts it from session and ignores client value.
      brandSlug: 'self',
    }),
  })
  if (!res.ok) return { ok: false, error: `${res.status} ${await res.text()}` }
  return { ok: true }
}

export async function requestUploadUrl(args: {
  brandSlug: string
  filename: string
  contentType: string
  sizeBytes: number
}): Promise<{ uploadUrl: string | null; r2Key: string; expiresInSec: number }> {
  const res = await fetch('/api/fonts/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok) throw new Error(`upload-url ${res.status}`)
  return res.json()
}
