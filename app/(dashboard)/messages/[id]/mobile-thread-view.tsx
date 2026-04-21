"use client"

import { useRouter } from "next/navigation"
import { ConversationThread } from "@/components/messages/conversation-thread"

export default function MobileThreadView({
  conversationId,
  userId,
}: {
  conversationId: string
  userId: string
}) {
  const router = useRouter()
  return (
    <ConversationThread
      conversationId={conversationId}
      userId={userId}
      onBack={() => router.push("/messages")}
    />
  )
}
