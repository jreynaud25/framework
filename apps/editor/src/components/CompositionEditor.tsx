import { useEffect, useMemo } from 'react'
import { TemplateRenderer, validateSlotValues } from '@framework/renderer'
import type { Format } from '@framework/types'
import { useCompositionStore } from '@/state/composition'
import type { CompositionPayload } from '@/data/loadComposition'
import { SlotEditors } from './SlotEditors'
import { FormatToggle } from './FormatToggle'

interface Props {
  data: CompositionPayload
}

export function CompositionEditor({ data }: Props) {
  const hydrate = useCompositionStore((s) => s.hydrate)
  const slotValues = useCompositionStore((s) => s.slotValues)
  const format = useCompositionStore((s) => s.format)

  useEffect(() => {
    hydrate({ format: data.format, slotValues: data.slotValues })
  }, [hydrate, data])

  const errors = useMemo(
    () => validateSlotValues(data.slotSchema, slotValues),
    [data.slotSchema, slotValues],
  )

  const imageResolver = useMemo(
    () => (key: string) => `${data.imageBaseUrl}/${key}`,
    [data.imageBaseUrl],
  )

  return (
    <div className="grid h-full grid-cols-[1fr_360px] overflow-hidden">
      <section className="grid place-items-center overflow-auto bg-[#0c0c0c] p-8">
        <PreviewStage>
          <TemplateRenderer
            layout={data.layout}
            tokens={data.tokens}
            slotValues={slotValues}
            format={format}
            imageResolver={imageResolver}
          />
        </PreviewStage>
      </section>
      <aside className="overflow-y-auto border-l border-[var(--line)] bg-[var(--bg)] p-5">
        <header className="mb-5">
          <div className="text-xs uppercase tracking-widest text-[var(--muted)]">Template</div>
          <h2 className="mt-1 text-lg">{data.templateName}</h2>
        </header>

        <FormatToggle formats={data.formats as Format[]} />

        <hr className="my-5 border-[var(--line)]" />

        <SlotEditors schema={data.slotSchema} errors={errors} />

        <hr className="my-5 border-[var(--line)]" />

        <div className="flex items-center gap-2">
          <button
            className="flex-1 rounded-full bg-[var(--fg)] px-4 py-2 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
            disabled={errors.some((e) => e.reason === 'required')}
            onClick={() => {
              // TODO: POST to /api/exports
              console.log('export request', { format, slotValues })
            }}
          >
            Export PNG
          </button>
          <button className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            Save draft
          </button>
        </div>
      </aside>
    </div>
  )
}

/** Box that scales the rendered template to fit the viewport at the chosen format. */
function PreviewStage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{ maxWidth: '100%', maxHeight: '100%' }}>
      <div className="origin-top-left scale-50 transform-gpu shadow-[0_8px_60px_rgba(0,0,0,0.4)] md:scale-75 lg:scale-100">
        {children}
      </div>
    </div>
  )
}
