import * as React from 'react'
import * as RE from '@react-email/components'

// React 19 type tightening: @react-email/components ships its own copy of
// @types/react; the cross-realm ReactNode mismatch is a typecheck-only blip,
// so we erase the boundary here and rely on runtime correctness.
type AnyComp = React.FC<Record<string, unknown> & { children?: unknown }>
const Html = RE.Html as unknown as AnyComp
const Head = RE.Head as unknown as AnyComp
const Preview = RE.Preview as unknown as AnyComp
const Tailwind = RE.Tailwind as unknown as AnyComp
const Body = RE.Body as unknown as AnyComp
const Container = RE.Container as unknown as AnyComp
const Section = RE.Section as unknown as AnyComp
const Hr = RE.Hr as unknown as AnyComp
const Text = RE.Text as unknown as AnyComp

interface Props {
  preview: string
  // Cross-realm @types/react inside @react-email widens our ReactNode; using
  // unknown sidesteps the typecheck while keeping JSX intact.
  children: unknown
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
            <Section>{children as React.ReactNode}</Section>
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
