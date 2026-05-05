import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://frame-work.app'),
  title: {
    default: 'Framework',
    template: '%s · Framework',
  },
  description:
    'Designer-authored, brand-locked, client-customizable templates. Figma in. On-brand assets out.',
  openGraph: {
    type: 'website',
    siteName: 'Framework',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
