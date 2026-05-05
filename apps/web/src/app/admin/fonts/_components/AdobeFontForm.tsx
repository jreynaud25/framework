'use client'
import { useState } from 'react'
import { Field } from './Field'
import { submitFont } from './submit'

export function AdobeFontForm() {
  const [state, setState] = useState({
    tokenKey: 'heading',
    familyName: 'Söhne',
    kitId: '',
    projectId: '',
  })
  const [status, setStatus] = useState<string | null>(null)

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const res = await submitFont({
          source: 'adobe',
          tokenKey: state.tokenKey,
          familyName: state.familyName,
          kitId: state.kitId,
          projectId: state.projectId,
        })
        setStatus(res.ok ? 'Saved' : `Error: ${res.error}`)
      }}
    >
      <p className="text-sm text-fw-muted">
        Adobe Fonts are tied to your Adobe subscription. Paste the Web Project ID (kit) here. We
        load fonts via the Adobe CDN on every page. PNG export uses headless Chrome instead of
        Satori for these.
      </p>
      <Field label="Token key">
        <select
          value={state.tokenKey}
          onChange={(e) => setState({ ...state, tokenKey: e.target.value })}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        >
          {['display', 'heading', 'body', 'mono', 'caption'].map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Family name (exact)">
        <input
          type="text"
          value={state.familyName}
          onChange={(e) => setState({ ...state, familyName: e.target.value })}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>
      <Field label="Adobe kit ID">
        <input
          type="text"
          value={state.kitId}
          onChange={(e) => setState({ ...state, kitId: e.target.value })}
          placeholder="e.g. abc1def"
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>
      <Field label="Project ID">
        <input
          type="text"
          value={state.projectId}
          onChange={(e) => setState({ ...state, projectId: e.target.value })}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>
      <div className="flex items-center justify-between pt-2">
        {status ? <span className="text-xs text-fw-muted">{status}</span> : <span />}
        <button
          type="submit"
          className="rounded-full bg-fw-fg px-4 py-2 text-sm font-medium text-fw-bg"
        >
          Save Adobe font
        </button>
      </div>
    </form>
  )
}
