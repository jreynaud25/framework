import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: 'Framework', template: '%s · Framework' },
  description:
    'Designer-authored, brand-locked, client-customizable templates. Figma in. On-brand assets out.',
  openGraph: { type: 'website', siteName: 'Framework' },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

/**
 * ClerkProvider is wrapped only when keys are present. Without them the
 * app boots as a tenant-routed Brand Hub + marketing site with zero auth
 * dependencies — useful for local dev and for shipping a public preview
 * before the Clerk production instance exists.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const html = (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
  return HAS_CLERK ? <ClerkProvider>{html}</ClerkProvider> : html
}
