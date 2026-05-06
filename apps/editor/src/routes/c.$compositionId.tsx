import { createFileRoute } from '@tanstack/react-router'
import { CompositionEditor } from '@/components/CompositionEditor'
import { loadCompositionById, type CompositionPayload } from '@/data/loadComposition'

export const Route = createFileRoute('/c/$compositionId')({
  loader: async ({ params }: { params: { compositionId: string } }) =>
    loadCompositionById(params.compositionId),
  component: CompositionRoute,
})

function CompositionRoute() {
  const data = Route.useLoaderData() as CompositionPayload
  return <CompositionEditor data={data} />
}
