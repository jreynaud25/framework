import { createFileRoute } from '@tanstack/react-router'
import { CompositionEditor } from '@/components/CompositionEditor'
import { loadCompositionById, type CompositionPayload } from '@/data/loadComposition'

export interface CompositionSearch {
  brand?: string
  designer?: '1'
  comp?: string
}

export const Route = createFileRoute('/c/$compositionId')({
  validateSearch: (raw: Record<string, unknown>): CompositionSearch => ({
    // Coerce to string — TanStack's default JSON.parse may turn '3070' into
    // a number, or anything else. Accept both forms.
    brand:
      raw.brand !== undefined && raw.brand !== null && raw.brand !== ''
        ? String(raw.brand)
        : undefined,
    designer: String(raw.designer) === '1' ? '1' : undefined,
    comp:
      raw.comp !== undefined && raw.comp !== null && raw.comp !== ''
        ? String(raw.comp)
        : undefined,
  }),
  // Re-run the loader when brand changes so the right template payload
  // gets fetched. The brand is then handed to the loader explicitly — no
  // more URLSearchParams fragility.
  loaderDeps: ({ search }: { search: CompositionSearch }) => ({
    brand: search.brand,
    comp: search.comp,
  }),
  loader: async ({
    params,
    deps,
  }: {
    params: { compositionId: string }
    deps: { brand?: string; comp?: string }
  }) => loadCompositionById(params.compositionId, { brand: deps.brand }),
  component: CompositionRoute,
})

function CompositionRoute() {
  const data = Route.useLoaderData() as CompositionPayload
  const search = Route.useSearch()
  return (
    <CompositionEditor
      data={data}
      designerEnabled={search.designer === '1'}
      currentComp={search.comp}
    />
  )
}
