import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailLayout } from './Layout'

interface Props {
  brandName: string
  templateName: string
  brandSlug: string
  templateSlug: string
  changeSummary: string[]
}

export function TemplateUpdatedEmail({
  brandName,
  templateName,
  brandSlug,
  templateSlug,
  changeSummary,
}: Props) {
  const url = `https://${brandSlug}.frame-work.app/templates/${templateSlug}`
  return (
    <EmailLayout preview={`${brandName} updated "${templateName}"`}>
      <Heading className="m-0 text-2xl font-medium leading-tight tracking-tight">
        {brandName} updated "{templateName}"
      </Heading>
      <Text className="text-[15px] text-[#a3a3a3]">
        Your designer pushed an update. We auto-merged your drafts where possible — your content is
        intact, only the layout, type, or color changed.
      </Text>
      {changeSummary.length > 0 ? (
        <Text className="text-[14px] text-[#a3a3a3]">
          What changed:
          <br />
          {changeSummary.map((c, i) => (
            <span key={i}>
              · {c}
              <br />
            </span>
          ))}
        </Text>
      ) : null}
      <Button
        href={url}
        className="rounded-full bg-[#fafafa] px-5 py-3 text-sm font-medium text-[#0a0a0a]"
      >
        Review the update
      </Button>
    </EmailLayout>
  )
}
