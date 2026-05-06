'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SlotDefinition } from '@framework/types'
import {
  addCommentReply,
  setCommentStatus,
  softDeleteTemplate,
  updateSlots,
} from '@/server/designer/store'

const PATH_PREFIX = '/designer/templates'

export async function saveSlotsAction(
  brandSlug: string,
  templateSlug: string,
  slots: SlotDefinition[],
): Promise<{ ok: boolean; error?: string }> {
  const ok = updateSlots(brandSlug, templateSlug, slots) !== undefined
  if (!ok) return { ok: false, error: 'Template not found' }
  revalidatePath(`${PATH_PREFIX}/${brandSlug}/${templateSlug}`)
  revalidatePath('/designer')
  return { ok: true }
}

export async function deleteTemplateAction(
  brandSlug: string,
  templateSlug: string,
): Promise<void> {
  const ok = softDeleteTemplate(brandSlug, templateSlug)
  if (!ok) throw new Error('Template not found')
  revalidatePath('/designer')
  redirect('/designer?deleted=1')
}

export async function replyToCommentAction(
  brandSlug: string,
  templateSlug: string,
  commentId: string,
  body: string,
  authorName: string,
): Promise<{ ok: boolean }> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false }
  addCommentReply(brandSlug, templateSlug, commentId, {
    authorName,
    body: trimmed,
  })
  revalidatePath(`${PATH_PREFIX}/${brandSlug}/${templateSlug}`)
  return { ok: true }
}

export async function setCommentStatusAction(
  brandSlug: string,
  templateSlug: string,
  commentId: string,
  status: 'open' | 'addressed' | 'wontfix',
): Promise<{ ok: boolean }> {
  const ok = setCommentStatus(brandSlug, templateSlug, commentId, status)
  if (ok) {
    revalidatePath(`${PATH_PREFIX}/${brandSlug}/${templateSlug}`)
    revalidatePath('/designer')
  }
  return { ok }
}
