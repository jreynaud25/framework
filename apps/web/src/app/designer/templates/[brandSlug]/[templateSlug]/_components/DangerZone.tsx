'use client'

import { useState, useTransition } from 'react'
import { deleteTemplateAction } from '../actions'

interface Props {
  brandSlug: string
  templateSlug: string
  templateName: string
}

export function DangerZone({ brandSlug, templateSlug, templateName }: Props) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [pending, startTransition] = useTransition()

  const ready = confirm === templateName

  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/[0.03] p-5">
      <div className="text-xs uppercase tracking-widest text-red-400">Danger zone</div>
      <p className="mt-2 text-sm text-fw-muted">
        Archiving a template hides it from new compositions. Existing exports stay intact; the
        brand client just won't see it in their template grid anymore.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 rounded-full border border-red-500/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
        >
          Archive template
        </button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!ready) return
            startTransition(async () => {
              await deleteTemplateAction(brandSlug, templateSlug)
            })
          }}
        >
          <label className="block">
            <div className="text-xs text-fw-muted">
              Type <span className="font-medium text-fw-fg">{templateName}</span> to confirm.
            </div>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoFocus
              className="mt-1.5 w-full rounded border border-fw-line bg-transparent p-2 text-sm focus:border-red-400 focus:outline-none"
            />
          </label>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setConfirm('')
              }}
              className="text-xs text-fw-muted hover:text-fw-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!ready || pending}
              className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {pending ? 'Archiving…' : 'Archive permanently'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
