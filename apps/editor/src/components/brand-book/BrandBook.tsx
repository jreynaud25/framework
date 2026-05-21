import { useEffect, useState } from 'react'
import type { BrandTokens } from '@framework/types'
import { useBrandContext } from '../brandContext'
import { HeroBand } from './HeroBand'
import { PaletteGrid } from './PaletteGrid'
import { SemanticList } from './SemanticList'
import { TypeSpecimen } from './TypeSpecimen'
import { LogoGallery } from './LogoGallery'

/**
 * Client-facing brand book. Auto-rendered from the brand's tokens — no
 * authoring needed. Themed via tokens.colors.semantic so each brand's
 * guidelines page feels uniquely "theirs". Sections appear only when
 * their data is non-empty.
 */
export function BrandBook() {
  const { brand, brandSlug } = useBrandContext()
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { tokens: BrandTokens }) => {
        if (!cancelled) setTokens(d.tokens)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [brandSlug])

  if (error) {
    return <div className="text-[12px] text-[var(--danger)]">{error}</div>
  }
  if (!tokens) {
    return <div className="text-[12px] text-[var(--muted)]">Loading…</div>
  }

  const pageBg = tokens.colors.semantic?.bg ?? '#ffffff'
  const pageFg = tokens.colors.semantic?.fg ?? '#0a0a0a'
  const accent = tokens.colors.primary
  const bodyFont = tokens.typography.body?.fontFamily ?? 'Inter'
  const headingFont = tokens.typography.heading?.fontFamily ?? bodyFont

  const hasPalette = (tokens.colors.palette?.length ?? 0) > 0
  const hasSemantic = tokens.colors.semantic && Object.keys(tokens.colors.semantic).length > 0
  const hasTypography = Object.keys(tokens.typography ?? {}).length > 0
  const hasLogos = (tokens.logos?.length ?? 0) > 0

  return (
    <div
      className="fw-bb"
      style={{
        background: pageBg,
        color: pageFg,
        fontFamily: bodyFont,
      }}
    >
      <HeroBand
        title={brand?.name ?? brandSlug}
        subtitle="Brand guidelines"
        accentColor={accent}
        headingFont={headingFont}
      />

      {hasPalette ? (
        <Section title="Palette" style={{ fontFamily: bodyFont }}>
          <PaletteGrid palette={tokens.colors.palette} />
        </Section>
      ) : null}

      {hasSemantic ? (
        <Section title="Semantic">
          <SemanticList semantic={tokens.colors.semantic!} />
        </Section>
      ) : null}

      {hasTypography ? (
        <Section title="Typography">
          {Object.entries(tokens.typography).map(([role, entry]) =>
            entry ? <TypeSpecimen key={role} role={role} entry={entry} /> : null,
          )}
        </Section>
      ) : null}

      {hasLogos ? (
        <Section title="Logos">
          <LogoGallery logos={tokens.logos} pageBg={pageBg} pageFg={pageFg} />
        </Section>
      ) : null}
    </div>
  )
}

function Section({
  title,
  children,
  style,
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section className="fw-bb__section" style={style}>
      <div className="fw-bb__section-inner">
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  )
}
