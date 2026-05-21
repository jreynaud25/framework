import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  deleteComposition,
  getComposition,
  updateComposition,
} from '@/server/composition-store'
import type { Format, SlotValues } from '@framework/types'

export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const comp = getComposition(id)
  if (!comp) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(comp))
}

const PutBody = z.object({
  slotValues: z.record(z.string(), z.unknown()).optional(),
  format: z.string().optional(),
  name: z.string().optional(),
})

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return cors(NextResponse.json({ error: 'invalid_json' }, { status: 400 }))
  }
  const parsed = PutBody.safeParse(body)
  if (!parsed.success) {
    return cors(NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 422 }))
  }
  const updated = updateComposition(id, {
    slotValues: parsed.data.slotValues as SlotValues | undefined,
    format: parsed.data.format as Format | undefined,
    name: parsed.data.name,
  })
  if (!updated) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(NextResponse.json(updated))
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const ok = deleteComposition(id)
  if (!ok) return cors(NextResponse.json({ error: 'not_found' }, { status: 404 }))
  return cors(new NextResponse(null, { status: 204 }))
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

function cors(res: NextResponse): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'content-type')
  return res
}
