'use client'

import { useMemo, useState, useTransition } from 'react'
import type { SlotDefinition } from '@framework/types'
import { saveSlotsAction } from '../actions'

interface Props {
  brandSlug: string
  templateSlug: string
  slots: SlotDefinition[]
}

type SlotState = SlotDefinition & { locked: boolean }

export function SlotConfigPanel({ brandSlug, templateSlug, slots }: Props) {
  const initial = useMemo<SlotState[]>(
    () => slots.map((s) => ({ ...s, locked: false })),
    [slots],
  )
  const [state, setState] = useState<SlotState[]>(initial)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)

  const dirty = JSON.stringify(state) !== JSON.stringify(initial)

  function update(idx: number, patch: Partial<SlotState>) {
    setState((s) =>
      // Slot is a discriminated union; keep the type tag stable while merging.
      s.map((x, i) => (i === idx ? ({ ...x, ...patch } as SlotState) : x)),
    )
  }

  function save() {
    setStatus(null)
    startTransition(async () => {
      // Drop `locked` slots from the saved schema — they are no longer
      // editable, so they shouldn't appear to the brand client.
      const next = state
        .filter((s) => !s.locked)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ locked: _, ...rest }) => rest as SlotDefinition)
      const res = await saveSlotsAction(brandSlug, templateSlug, next)
      setStatus(res.ok ? 'Saved' : `Error: ${res.error ?? 'unknown'}`)
    })
  }

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-fw-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fw-line bg-[#0e0e0e] text-left">
              <Th>Slot</Th>
              <Th>Type</Th>
              <Th>Constraints</Th>
              <Th right>Required</Th>
              <Th right>Locked</Th>
            </tr>
          </thead>
          <tbody>
            {state.map((slot, i) => (
              <tr
                key={slot.key}
                className={
                  'border-b border-fw-line last:border-0 ' +
                  (slot.locked ? 'opacity-40' : '')
                }
              >
                <Td>
                  <div className="font-mono text-[12px]">{slot.key}</div>
                  <input
                    value={slot.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    className="mt-1 w-full rounded border border-fw-line bg-transparent p-1 text-sm"
                  />
                </Td>
                <Td>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-fw-muted">
                    {slot.type}
                  </span>
                </Td>
                <Td>
                  <SlotConstraintsEditor slot={slot} onPatch={(p) => update(i, p)} />
                </Td>
                <Td right>
                  <Toggle
                    checked={Boolean(getRequired(slot))}
                    disabled={slot.type === 'choice'}
                    onChange={(checked) => update(i, setRequired(slot, checked) as Partial<SlotState>)}
                  />
                </Td>
                <Td right>
                  <Toggle
                    checked={slot.locked}
                    onChange={(checked) => update(i, { locked: checked })}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {status ? <span className="text-xs text-fw-muted">{status}</span> : <span />}
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={save}
          className="rounded-full bg-fw-fg px-4 py-2 text-sm font-medium text-fw-bg disabled:opacity-40"
        >
          {pending ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
        </button>
      </div>
    </div>
  )
}

function getRequired(slot: SlotDefinition): boolean {
  if (slot.type === 'text' || slot.type === 'image') return Boolean(slot.constraints.required)
  return false
}

function setRequired(slot: SlotDefinition, value: boolean): Partial<SlotDefinition> {
  if (slot.type === 'text') {
    return { constraints: { ...slot.constraints, required: value } } as Partial<SlotDefinition>
  }
  if (slot.type === 'image') {
    return { constraints: { ...slot.constraints, required: value } } as Partial<SlotDefinition>
  }
  return {}
}

function SlotConstraintsEditor({
  slot,
  onPatch,
}: {
  slot: SlotDefinition
  onPatch: (patch: Partial<SlotDefinition>) => void
}) {
  if (slot.type === 'text') {
    const c = slot.constraints
    return (
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-fw-muted">max</span>
          <input
            type="number"
            min={1}
            value={c.maxChars ?? ''}
            onChange={(e) =>
              onPatch({
                constraints: {
                  ...c,
                  maxChars: e.target.value ? Number(e.target.value) : undefined,
                },
              } as Partial<SlotDefinition>)
            }
            className="w-16 rounded border border-fw-line bg-transparent p-1"
          />
        </label>
      </div>
    )
  }
  if (slot.type === 'image') {
    const c = slot.constraints
    return (
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-fw-muted">aspect</span>
          <input
            type="text"
            value={c.aspectRatio ? c.aspectRatio.toFixed(3) : ''}
            placeholder="auto"
            readOnly
            className="w-20 rounded border border-fw-line bg-transparent p-1 text-fw-muted"
          />
        </label>
      </div>
    )
  }
  if (slot.type === 'color') {
    const c = slot.constraints
    return (
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={c.paletteOnly ?? false}
          onChange={(e) =>
            onPatch({
              constraints: { paletteOnly: e.target.checked },
            } as Partial<SlotDefinition>)
          }
        />
        <span>Palette-only</span>
      </label>
    )
  }
  return <span className="text-fw-muted">—</span>
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (b: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        'inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
        (checked ? 'bg-fw-fg' : 'bg-fw-line') +
        (disabled ? ' opacity-40' : '')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-fw-bg transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        }
      />
    </button>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={
        'p-3 text-xs uppercase tracking-widest text-fw-muted ' +
        (right ? 'text-right' : 'text-left')
      }
    >
      {children}
    </th>
  )
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={'p-3 align-top ' + (right ? 'text-right' : 'text-left')}>{children}</td>
}
