import { FontUploadPanel } from './_components/FontUploadPanel'

export const metadata = { title: 'Fonts' }

export default function AdminFontsPage() {
  return (
    <main className="min-h-dvh px-8 py-12">
      <div>
        <div className="text-xs uppercase tracking-widest text-fw-muted">Brand admin</div>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Fonts</h1>
        <p className="mt-2 max-w-xl text-fw-muted">
          Three sources, three legal flows. Google Fonts and Adobe Fonts are loaded by reference.
          Self-hosted fonts require a per-domain webfont license you confirm here.
        </p>
      </div>

      <FontUploadPanel />
    </main>
  )
}
