'use client'
import { useState } from 'react'
import { Field } from './Field'
import { submitFont, requestUploadUrl } from './submit'

interface VariantState {
  file: File
  weight: number
  style: 'normal' | 'italic'
  r2Key?: string
  fontFileHash?: string
  uploaded: boolean
  error?: string
}

const ATTESTATION_BOILERPLATE =
  'I confirm that {brand} holds a webfont license covering all of *.frame-work.app/{slug} for ' +
  '{family}. I accept that Framework will serve these font files only on that domain, and that ' +
  'I am responsible for keeping the license valid.'

export function SelfHostedFontForm() {
  const [tokenKey, setTokenKey] = useState('heading')
  const [familyName, setFamilyName] = useState('')
  const [variants, setVariants] = useState<VariantState[]>([])
  const [agree, setAgree] = useState(false)
  const [attestationText, setAttestationText] = useState(ATTESTATION_BOILERPLATE)
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const ready =
    familyName.length > 1 &&
    variants.length > 0 &&
    variants.every((v) => v.uploaded) &&
    agree &&
    attestationText.length >= 20

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const next: VariantState[] = await Promise.all(
      files.map(async (file) => {
        const buf = await file.arrayBuffer()
        const hash = await sha256(buf)
        const guess = guessWeightStyle(file.name)
        return {
          file,
          weight: guess.weight,
          style: guess.style,
          fontFileHash: hash,
          uploaded: false,
        }
      }),
    )
    setVariants(next)
  }

  async function uploadAll() {
    setSubmitting(true)
    setStatus(null)
    try {
      const uploaded: VariantState[] = []
      for (const v of variants) {
        const presigned = await requestUploadUrl({
          brandSlug: 'self', // resolved server-side via auth
          filename: v.file.name,
          contentType: v.file.type || 'font/woff2',
          sizeBytes: v.file.size,
        })
        // TODO(week 4): once R2 presigning is wired, PUT v.file to presigned.uploadUrl.
        // Until then we hand back the r2Key so the api can wire it later.
        uploaded.push({ ...v, r2Key: presigned.r2Key, uploaded: true })
      }
      setVariants(uploaded)
      setStatus('Uploaded — confirm the attestation to publish.')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function publish() {
    setSubmitting(true)
    setStatus(null)
    try {
      const res = await submitFont({
        source: 'self_hosted',
        tokenKey,
        familyName,
        variants: variants.map((v) => ({
          weight: v.weight,
          style: v.style,
          r2Key: v.r2Key!,
          fileSize: v.file.size,
          format: extOf(v.file.name) as 'woff2' | 'woff' | 'ttf' | 'otf',
          fontFileHash: v.fontFileHash!,
        })),
        attestation: { text: attestationText },
      })
      setStatus(res.ok ? 'Published.' : `Error: ${res.error}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-fw-muted">
        Upload WOFF2 files plus a click-through license attestation. We log it append-only and
        serve the font files only on your tenant subdomain. Liability for the license sits with
        you, the attesting admin.
      </p>

      <Field label="Token key">
        <select
          value={tokenKey}
          onChange={(e) => setTokenKey(e.target.value)}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        >
          {['display', 'heading', 'body', 'mono', 'caption'].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Family name (exact, as it appears in the OTF)">
        <input
          type="text"
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>

      <Field label="Font files (.woff2, .woff, .otf, .ttf)">
        <input
          type="file"
          multiple
          accept=".woff2,.woff,.otf,.ttf,font/woff2,font/woff,font/ttf,font/otf"
          onChange={onPickFiles}
          className="text-sm"
        />
      </Field>

      {variants.length > 0 ? (
        <div className="space-y-2 rounded-md border border-fw-line p-3">
          {variants.map((v, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <span className="flex-1 truncate font-mono text-xs text-fw-muted">{v.file.name}</span>
              <input
                type="number"
                value={v.weight}
                onChange={(e) =>
                  setVariants(
                    variants.map((x, ix) =>
                      ix === i ? { ...x, weight: Number(e.target.value) } : x,
                    ),
                  )
                }
                className="w-20 rounded border border-fw-line bg-transparent p-1 text-xs"
              />
              <select
                value={v.style}
                onChange={(e) =>
                  setVariants(
                    variants.map((x, ix) =>
                      ix === i ? { ...x, style: e.target.value as 'normal' | 'italic' } : x,
                    ),
                  )
                }
                className="rounded border border-fw-line bg-transparent p-1 text-xs"
              >
                <option value="normal">normal</option>
                <option value="italic">italic</option>
              </select>
              <span className="font-mono text-[10px] text-fw-muted">
                {(v.file.size / 1024).toFixed(0)} KB
              </span>
              {v.uploaded ? <span className="text-[10px] text-emerald-400">uploaded</span> : null}
            </div>
          ))}
          {!variants.every((v) => v.uploaded) ? (
            <button
              type="button"
              disabled={submitting}
              onClick={uploadAll}
              className="mt-2 rounded-full border border-fw-line px-3 py-1.5 text-xs"
            >
              Upload files
            </button>
          ) : null}
        </div>
      ) : null}

      <Field label="License attestation (editable, signed when you click Publish)">
        <textarea
          rows={4}
          value={attestationText}
          onChange={(e) => setAttestationText(e.target.value)}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1"
        />
        <span>
          I confirm I hold a webfont license covering this domain for the file(s) above and agree to
          the attestation text. I understand it will be logged append-only with my IP and timestamp.
        </span>
      </label>

      <div className="flex items-center justify-between pt-2">
        {status ? <span className="text-xs text-fw-muted">{status}</span> : <span />}
        <button
          type="button"
          disabled={!ready || submitting}
          onClick={publish}
          className="rounded-full bg-fw-fg px-4 py-2 text-sm font-medium text-fw-bg disabled:opacity-40"
        >
          Publish font
        </button>
      </div>
    </div>
  )
}

function guessWeightStyle(name: string): { weight: number; style: 'normal' | 'italic' } {
  const lower = name.toLowerCase()
  const style: 'normal' | 'italic' = lower.includes('italic') || lower.includes('oblique') ? 'italic' : 'normal'
  if (lower.includes('thin')) return { weight: 100, style }
  if (lower.includes('extralight') || lower.includes('ultralight')) return { weight: 200, style }
  if (lower.includes('light')) return { weight: 300, style }
  if (lower.includes('semibold') || lower.includes('demibold')) return { weight: 600, style }
  if (lower.includes('extrabold') || lower.includes('ultrabold')) return { weight: 800, style }
  if (lower.includes('black') || lower.includes('heavy')) return { weight: 900, style }
  if (lower.includes('bold')) return { weight: 700, style }
  if (lower.includes('medium')) return { weight: 500, style }
  return { weight: 400, style }
}

function extOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.(woff2|woff|otf|ttf)$/)
  return m ? m[1]! : 'woff2'
}

async function sha256(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
