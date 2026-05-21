import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useBrandBookContext } from './brandBookContext'
import { fireCommand } from './commandBus'

interface Props {
  onClose: () => void
}

type CommandKind =
  | { type: 'page'; pageId: string; slug: string; title: string; subtitle?: string; childOf?: string }
  | { type: 'action'; id: string; label: string; hint?: string; run: () => void }

/**
 * Minimal command palette. Lists every brand-book page + a handful of
 * quick actions; filters by fuzzy substring match; arrows + enter to
 * commit. Opens with ⌘K / Ctrl+K.
 */
export function CommandPalette({ onClose }: Props) {
  const { book, brandSlug, designerEnabled } = useBrandBookContext()
  const navigate = useNavigate()
  const location = useLocation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Build the command list each render. Pages first, then actions.
  const commands = useMemo<CommandKind[]>(() => {
    const list: CommandKind[] = []
    for (const page of book.pages) {
      if (page.hidden && !designerEnabled) continue
      const parent = page.parentId ? book.pages.find((p) => p.id === page.parentId) : null
      list.push({
        type: 'page',
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        childOf: parent?.title,
      })
    }
    list.push({
      type: 'action',
      id: 'templates',
      label: 'Open templates',
      hint: 'Templates grid for this brand',
      run: () => {
        void navigate({
          to: '/b/$brandSlug',
          params: { brandSlug },
          search: designerEnabled ? { designer: '1' as const } : undefined,
        })
      },
    })
    if (designerEnabled) {
      list.push({
        type: 'action',
        id: 'new-page',
        label: 'New page',
        hint: 'Add a page to the brand book',
        run: () => fireCommand('new-page'),
      })
      list.push({
        type: 'action',
        id: 'edit-brand',
        label: 'Edit brand settings',
        hint: 'Name, primary color, industry, client email',
        run: () => fireCommand('edit-brand'),
      })
      list.push({
        type: 'action',
        id: 'view-as-client',
        label: 'View as client',
        hint: 'Hide designer chrome',
        run: () => {
          void navigate({ to: '.', search: {}, replace: true })
        },
      })
    } else {
      list.push({
        type: 'action',
        id: 'view-as-designer',
        label: 'View as designer',
        hint: 'Show designer chrome',
        run: () => {
          void navigate({ to: '.', search: { designer: '1' as const }, replace: true })
        },
      })
      list.push({
        type: 'action',
        id: 'print',
        label: 'Print this page',
        hint: 'Print stylesheet',
        run: () => window.print(),
      })
    }
    list.push({
      type: 'action',
      id: 'studio',
      label: 'Back to studio',
      hint: 'Designer dashboard with all brands',
      run: () => {
        void navigate({ to: '/d' })
      },
    })
    return list
  }, [book.pages, brandSlug, designerEnabled, navigate])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => {
      const hay =
        c.type === 'page'
          ? `${c.title} ${c.subtitle ?? ''} ${c.childOf ?? ''} ${c.slug}`
          : `${c.label} ${c.hint ?? ''}`
      return hay.toLowerCase().includes(q)
    })
  }, [commands, query])

  // Keep `active` in bounds when filter shrinks the list.
  useEffect(() => {
    if (active >= filtered.length) setActive(Math.max(0, filtered.length - 1))
  }, [active, filtered.length])

  const commit = (cmd: CommandKind) => {
    onClose()
    if (cmd.type === 'page') {
      const page = book.pages.find((p) => p.id === cmd.pageId)
      if (!page) return
      if (page.parentId) {
        const parent = book.pages.find((p) => p.id === page.parentId)
        if (parent) {
          void navigate({
            to: '/b/$brandSlug/guidelines/$pageSlug/$childSlug',
            params: { brandSlug, pageSlug: parent.slug, childSlug: page.slug },
            search: designerEnabled ? { designer: '1' as const } : undefined,
          })
          return
        }
      }
      void navigate({
        to: '/b/$brandSlug/guidelines/$pageSlug',
        params: { brandSlug, pageSlug: page.slug },
        search: designerEnabled ? { designer: '1' as const } : undefined,
      })
    } else {
      cmd.run()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[active]
      if (cmd) commit(cmd)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  // Suppress the current-location indicator hint
  void location

  return (
    <div className="fw-cmdk__backdrop" onClick={onClose}>
      <div className="fw-cmdk" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="fw-cmdk__input"
          placeholder="Search pages or commands…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        <div className="fw-cmdk__list" role="listbox">
          {filtered.length === 0 ? (
            <div className="fw-cmdk__empty">No matches</div>
          ) : (
            filtered.map((c, i) => (
              <button
                key={c.type === 'page' ? `p:${c.pageId}` : `a:${c.id}`}
                type="button"
                className={`fw-cmdk__row ${i === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(c)}
              >
                <div>
                  <div className="fw-cmdk__row-label">
                    {c.type === 'page' ? c.title : c.label}
                  </div>
                  <div className="fw-cmdk__row-hint">
                    {c.type === 'page'
                      ? c.childOf
                        ? `Page · ${c.childOf} › ${c.slug}`
                        : `Page · ${c.slug}`
                      : c.hint}
                  </div>
                </div>
                <span className="fw-cmdk__row-kind">
                  {c.type === 'page' ? '↩' : '⌘'}
                </span>
              </button>
            ))
          )}
        </div>
        <div className="fw-cmdk__footer">
          <span>↑↓ navigate</span>
          <span>↩ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
