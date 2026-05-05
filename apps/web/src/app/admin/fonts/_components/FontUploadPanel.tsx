'use client'
import { useState } from 'react'
import { GoogleFontForm } from './GoogleFontForm'
import { AdobeFontForm } from './AdobeFontForm'
import { SelfHostedFontForm } from './SelfHostedFontForm'

type Source = 'google' | 'adobe' | 'self_hosted'

export function FontUploadPanel() {
  const [source, setSource] = useState<Source>('google')

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2 rounded-full border border-fw-line p-1 text-xs">
        {(['google', 'adobe', 'self_hosted'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            className={
              'rounded-full px-3 py-1.5 transition-colors ' +
              (s === source ? 'bg-fw-fg text-fw-bg' : 'text-fw-muted hover:text-fw-fg')
            }
          >
            {labelFor(s)}
          </button>
        ))}
      </div>

      <div className="mt-6 max-w-xl rounded-md border border-fw-line bg-[#0c0c0c] p-6">
        {source === 'google' ? <GoogleFontForm /> : null}
        {source === 'adobe' ? <AdobeFontForm /> : null}
        {source === 'self_hosted' ? <SelfHostedFontForm /> : null}
      </div>
    </div>
  )
}

function labelFor(s: Source): string {
  switch (s) {
    case 'google':
      return 'Google Fonts'
    case 'adobe':
      return 'Adobe Fonts'
    case 'self_hosted':
      return 'Self-hosted'
  }
}
