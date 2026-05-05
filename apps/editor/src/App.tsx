import { EditorShell } from './ui/EditorShell'
import { sampleProject } from './sample/sampleProject'

export function App() {
  return <EditorShell initial={sampleProject} />
}
