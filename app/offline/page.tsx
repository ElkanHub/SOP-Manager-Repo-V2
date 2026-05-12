import { WifiOff } from "lucide-react"

export const metadata = {
  title: "Offline — SOP-Guard Pro",
}

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        This page isn&apos;t available offline yet. Pages you&apos;ve already visited
        and your locally cached SOPs and equipment will still load.
      </p>
      <p className="text-xs text-muted-foreground">
        Any changes you make will sync automatically when you reconnect.
      </p>
    </div>
  )
}
