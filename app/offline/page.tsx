import { Metadata } from "next"
import { OfflineScreen } from "./offline-screen"

export const metadata: Metadata = {
  title: "Offline — QMS-MANAJA",
  description: "You're currently offline. QMS-MANAJA will reconnect automatically.",
}

export default function OfflinePage() {
  return <OfflineScreen />
}
