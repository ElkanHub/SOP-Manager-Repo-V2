import { Metadata } from "next"
import { OfflineScreen } from "./offline-screen"

export const metadata: Metadata = {
  title: "Offline — SOP-Guard Pro",
  description: "You're currently offline. SOP-Guard Pro will reconnect automatically.",
}

export default function OfflinePage() {
  return <OfflineScreen />
}
