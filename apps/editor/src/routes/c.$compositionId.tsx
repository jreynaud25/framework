import { createFileRoute } from '@tanstack/react-router'
import { CompositionEditor } from '@/components/CompositionEditor'
import { loadCompositionById } from '@/data/loadComposition'

export const Route = createFileRoute('/c/$compositionId')({
  loader: async ({ params }) => loadCompositionById(params.compositionId),
  component: CompositionRoute,
})

function CompositionRoute() {
  const data = Route.useLoaderData()
  return <CompositionEditor data={data} />
}
