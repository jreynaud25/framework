import { useEffect } from 'react'
import { useEditorStore, type EditorProject } from '../state/editorStore'
import { CanvasPreview } from './CanvasPreview'
import { SlotInspector } from './SlotInspector'
import { TopBar } from './TopBar'

interface Props {
  initial: EditorProject
}

export function EditorShell({ initial }: Props) {
  const setProject = useEditorStore((s) => s.setProject)
  const project = useEditorStore((s) => s.project)

  useEffect(() => {
    setProject(initial)
  }, [initial, setProject])

  if (!project) return null

  return (
    <div className="grid h-full grid-rows-[56px_1fr] bg-fw-bg text-fw-fg">
      <TopBar />
      <div className="grid grid-cols-[1fr_360px] overflow-hidden">
        <CanvasPreview />
        <SlotInspector />
      </div>
    </div>
  )
}
