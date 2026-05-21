import { useEffect, useState } from 'react'
import type { BrandTokens } from '@framework/types'
import { useBrandContext } from '../brandContext'
import { HeroBand } from './HeroBand'
import { PaletteGrid } from './PaletteGrid'
import { SemanticList } from './SemanticList'
import { TypeSpecimen } from './TypeSpecimen'
import { LogoGallery } from './LogoGallery'
import { PhotoGrid } from './PhotoGrid'
import { PatternsSection } from './PatternsSection'
import { VoicePage } from './VoicePage'
import { ImageryPage } from './ImageryPage'
import type { BrandAsset } from './types'

/**
 * Client-facing brand book. Auto-rendered from the brand's tokens — no
 * authoring needed. Themed via tokens.colors.semantic so each brand's
 * guidelines page feels uniquely "theirs". Sections appear only when
 * their data is non-empty.
 */
export function BrandBook() {
  const { brand, brandSlug } = useBrandContext()
  const [tokens, setTokens] = useState<BrandTokens | null>(null)
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}/tokens`).then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`tokens HTTP ${r.status}`)),
      ),
      fetch(`/api/brands/${encodeURIComponent(brandSlug)}/assets`).then((r) =>
        r.ok ? r.json() : Promise.resolve({ assets: [] }),
      ),
    ])
      .then(([t, a]: [{ tokens: BrandTokens }, { assets: BrandAsset[] }]) => {
        if (cancelled) return
        setTokens(t.tokens)
        setAssets(a.assets)
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
  const photos = assets.filter((a) => a.kind === 'photo')
  const patterns = assets.filter((a) => a.kind === 'pattern')

  const hasVoice =
    !!tokens.voice &&
    (tokens.voice.tone.length > 0 ||
      tokens.voice.vocabulary.preferred.length > 0 ||
      tokens.voice.vocabulary.avoid.length > 0 ||
      tokens.voice.forbidden.length > 0)
  const hasImagery =
    !!tokens.imagery && (tokens.imagery.dos.length > 0 || tokens.imagery.donts.length > 0)

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

      {photos.length > 0 ? (
        <Section title="Photography">
          <PhotoGrid photos={photos} />
        </Section>
      ) : null}

      {patterns.length > 0 ? (
        <Section title="Patterns">
          <PatternsSection patterns={patterns} />
        </Section>
      ) : null}

      {hasVoice ? (
        <Section title="Voice & tone">
          <VoicePage voice={tokens.voice!} />
        </Section>
      ) : null}

      {hasImagery ? (
        <Section title="Imagery">
          <ImageryPage imagery={tokens.imagery!} />
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
