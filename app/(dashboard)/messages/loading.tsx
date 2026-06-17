export default function MessagesLoading() {
  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="p-3">
          <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex flex-col gap-1 px-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread placeholder */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
