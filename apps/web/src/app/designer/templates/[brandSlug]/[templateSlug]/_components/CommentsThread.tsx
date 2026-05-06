'use client'

import { useState, useTransition } from 'react'
import type { Comment } from '@/server/designer/store'
import { replyToCommentAction, setCommentStatusAction } from '../actions'

interface Props {
  brandSlug: string
  templateSlug: string
  comments: Comment[]
}

export function CommentsThread({ brandSlug, templateSlug, comments }: Props) {
  if (comments.length === 0) {
    return (
      <div className="rounded-md border border-fw-line bg-[#0c0c0c] p-6 text-sm text-fw-muted">
        No comments yet. When the brand pins a comment to a slot in the editor, it lands here.
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <CommentCard
          key={c.id}
          comment={c}
          brandSlug={brandSlug}
          templateSlug={templateSlug}
        />
      ))}
    </div>
  )
}

function CommentCard({
  comment,
  brandSlug,
  templateSlug,
}: {
  comment: Comment
  brandSlug: string
  templateSlug: string
}) {
  const [reply, setReply] = useState('')
  const [pending, startTransition] = useTransition()

  function submitReply() {
    if (!reply.trim()) return
    startTransition(async () => {
      await replyToCommentAction(
        brandSlug,
        templateSlug,
        comment.id,
        reply,
        'Designer',
      )
      setReply('')
    })
  }

  function setStatus(status: 'open' | 'addressed' | 'wontfix') {
    startTransition(async () => {
      await setCommentStatusAction(brandSlug, templateSlug, comment.id, status)
    })
  }

  const tone =
    comment.status === 'open'
      ? 'border-amber-500/40 bg-amber-500/[0.03]'
      : comment.status === 'addressed'
        ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
        : 'border-fw-line bg-[#0c0c0c]'

  return (
    <article className={'rounded-md border p-4 ' + tone}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-medium">{comment.authorName}</span>
          <span className="text-[11px] uppercase tracking-widest text-fw-muted">
            {comment.authorRole}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-fw-muted">
          {comment.pinnedToSlotKey ? (
            <span className="rounded-full border border-fw-line px-2 py-0.5 font-mono">
              📌 {comment.pinnedToSlotKey}
            </span>
          ) : null}
          <span>{relative(comment.createdAt)}</span>
          <StatusBadge status={comment.status} />
        </div>
      </header>

      <p className="mt-3 text-sm">{comment.body}</p>

      {comment.replies.length > 0 ? (
        <div className="mt-4 space-y-3 border-l border-fw-line pl-4">
          {comment.replies.map((r) => (
            <div key={r.id}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">{r.authorName}</span>
                <span className="text-[11px] uppercase tracking-widest text-fw-muted">
                  {r.authorRole}
                </span>
                <span className="text-[11px] text-fw-muted">{relative(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm">{r.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <textarea
          rows={2}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply…"
          className="flex-1 min-w-[260px] rounded-md border border-fw-line bg-transparent p-2 text-sm focus:border-fw-fg focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!reply.trim() || pending}
            onClick={submitReply}
            className="rounded-full border border-fw-line px-3 py-1.5 text-xs hover:bg-fw-line disabled:opacity-40"
          >
            Reply
          </button>
          {comment.status === 'open' ? (
            <>
              <button
                type="button"
                onClick={() => setStatus('addressed')}
                className="rounded-full bg-fw-fg px-3 py-1.5 text-xs font-medium text-fw-bg"
              >
                Mark addressed
              </button>
              <button
                type="button"
                onClick={() => setStatus('wontfix')}
                className="rounded-full border border-fw-line px-3 py-1.5 text-xs text-fw-muted hover:bg-fw-line"
              >
                Won't fix
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setStatus('open')}
              className="rounded-full border border-fw-line px-3 py-1.5 text-xs text-fw-muted hover:bg-fw-line"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function StatusBadge({ status }: { status: Comment['status'] }) {
  if (status === 'open')
    return (
      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-300">Open</span>
    )
  if (status === 'addressed')
    return (
      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
        Addressed
      </span>
    )
  return <span className="rounded-full bg-fw-line px-2 py-0.5">Won't fix</span>
}

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
