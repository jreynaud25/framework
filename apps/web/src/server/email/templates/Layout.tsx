import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

interface Props {
  preview: string
  children: React.ReactNode
}

/** Shared chrome for every transactional email. Black, spare, Vevo-coded. */
export function EmailLayout({ preview, children }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-[#0a0a0a] py-10 font-sans text-[#fafafa]">
          <Container className="mx-auto w-full max-w-[560px] rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] p-10">
            <Section className="mb-8">
              <Text className="m-0 text-xl font-medium tracking-tight">Framework</Text>
            </Section>
            <Section>{children}</Section>
            <Hr className="my-8 border-[#1f1f1f]" />
            <Text className="m-0 text-xs text-[#737373]">
              You received this because you have an account on Framework. Not you?{' '}
              <a className="text-[#fafafa] underline" href="https://frame-work.app/account">
                Manage your settings
              </a>
              .
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
