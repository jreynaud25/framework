import { useBrandBookContext } from '../../brandBookContext'
import { StringListField } from '../fields'

interface Props {
  field: 'tone' | 'vocabulary' | 'forbidden'
}

const emptyVoice = {
  tone: [],
  vocabulary: { preferred: [], avoid: [] },
  forbidden: [],
}

/**
 * Editor for `tokens.voice` — tone words, preferred / avoid vocabulary,
 * and forbidden terms. Pass `field` to scope the editor to one slice.
 */
export function VoiceEditor({ field }: Props) {
  const { tokens, patchTokens } = useBrandBookContext()
  const voice = tokens.voice ?? emptyVoice

  const updateTone = (next: string[]) => {
    void patchTokens({ voice: { ...voice, tone: next } })
  }
  const updatePreferred = (next: string[]) => {
    void patchTokens({
      voice: { ...voice, vocabulary: { ...voice.vocabulary, preferred: next } },
    })
  }
  const updateAvoid = (next: string[]) => {
    void patchTokens({
      voice: { ...voice, vocabulary: { ...voice.vocabulary, avoid: next } },
    })
  }
  const updateForbidden = (next: string[]) => {
    void patchTokens({ voice: { ...voice, forbidden: next } })
  }

  return (
    <div className="fw-bbook-edit__tokens">
      <div className="fw-bbook-edit__tokens-head">
        <span>tokens.voice</span>
        <span className="fw-bbook-edit__tokens-tag">shared</span>
      </div>
      <div className="fw-bbook-edit__tokens-list">
        {field === 'tone' ? (
          <StringListField
            label="Tone"
            value={voice.tone}
            onChange={updateTone}
            placeholder="e.g. Confident"
          />
        ) : null}
        {field === 'vocabulary' ? (
          <>
            <StringListField
              label="Preferred"
              value={voice.vocabulary.preferred}
              onChange={updatePreferred}
            />
            <StringListField
              label="Avoid"
              value={voice.vocabulary.avoid}
              onChange={updateAvoid}
            />
          </>
        ) : null}
        {field === 'forbidden' ? (
          <StringListField
            label="Forbidden"
            value={voice.forbidden}
            onChange={updateForbidden}
          />
        ) : null}
      </div>
    </div>
  )
}
