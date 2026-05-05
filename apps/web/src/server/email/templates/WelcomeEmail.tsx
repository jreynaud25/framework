import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailLayout } from './Layout'

interface Props {
  firstName?: string | null
  brandSlug: string
}

export function WelcomeEmail({ firstName, brandSlug }: Props) {
  const url = `https://${brandSlug}.frame-work.app`
  return (
    <EmailLayout preview="Your brand is ready on Framework">
      <Heading className="m-0 text-2xl font-medium leading-tight tracking-tight">
        {firstName ? `${firstName}, your brand is ready.` : 'Your brand is ready.'}
      </Heading>
      <Text className="text-[15px] text-[#a3a3a3]">
        Your Brand Hub is live at <strong>{brandSlug}.frame-work.app</strong>. The first thing to do
        is invite your designer — they'll push the templates and you'll edit them like an AI tool,
        always staying on brand.
      </Text>
      <Button
        href={url}
        className="rounded-full bg-[#fafafa] px-5 py-3 text-sm font-medium text-[#0a0a0a]"
      >
        Open your hub
      </Button>
    </EmailLayout>
  )
}
