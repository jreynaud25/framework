import * as React from 'react'
import { Button, Heading, Text } from '@react-email/components'
import { EmailLayout } from './Layout'

interface Props {
  designerName: string
  brandName: string
  commentCount: number
  templateName: string
  dashboardUrl: string
}

export function CommentReceivedEmail({
  designerName,
  brandName,
  commentCount,
  templateName,
  dashboardUrl,
}: Props) {
  return (
    <EmailLayout preview={`${brandName} sent ${commentCount} comment(s) on ${templateName}`}>
      <Heading className="m-0 text-2xl font-medium leading-tight tracking-tight">
        {designerName ? `${designerName}, ` : ''}
        {brandName} sent {commentCount} comment{commentCount === 1 ? '' : 's'} on "{templateName}".
      </Heading>
      <Text className="text-[15px] text-[#a3a3a3]">
        Each comment is pinned to a specific element in the template. Open your dashboard, address
        them in Figma, and push the update — Framework will mark them as resolved automatically.
      </Text>
      <Button
        href={dashboardUrl}
        className="rounded-full bg-[#fafafa] px-5 py-3 text-sm font-medium text-[#0a0a0a]"
      >
        Open dashboard
      </Button>
    </EmailLayout>
  )
}
