'use client'
import { useState } from 'react'
import { Field } from './Field'
import { submitFont } from './submit'

export function GoogleFontForm() {
  const [state, setState] = useState({
    tokenKey: 'heading',
    familyName: 'Inter',
    weights: '400, 600, 800',
  })
  const [status, setStatus] = useState<string | null>(null)

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault()
        const weights = state.weights
          .split(',')
          .map((w) => parseInt(w.trim(), 10))
          .filter((w) => Number.isFinite(w))
        const res = await submitFont({
          source: 'google',
          tokenKey: state.tokenKey,
          familyName: state.familyName,
          weights,
        })
        setStatus(res.ok ? 'Saved' : `Error: ${res.error}`)
      }}
    >
      <p className="text-sm text-fw-muted">
        Open-source. Free to embed and serve. We add a <code>&lt;link&gt;</code> to the Google CDN
        on every Brand Hub page that uses this token.
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
      <Field label="Weights (comma-separated)">
        <input
          type="text"
          value={state.weights}
          onChange={(e) => setState({ ...state, weights: e.target.value })}
          className="w-full rounded-md border border-fw-line bg-transparent p-2 text-sm"
        />
      </Field>
      <div className="flex items-center justify-between pt-2">
        {status ? <span className="text-xs text-fw-muted">{status}</span> : <span />}
        <button
          type="submit"
          className="rounded-full bg-fw-fg px-4 py-2 text-sm font-medium text-fw-bg"
        >
          Save Google font
        </button>
      </div>
    </form>
  )
}
