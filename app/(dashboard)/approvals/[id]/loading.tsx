export default function ApprovalDetailLoading() {
  return (
    <div className="flex h-full gap-0">
      {/* Left: document viewer */}
      <div className="flex-1 p-8 flex flex-col gap-4 border-r border-border overflow-hidden">
        <div className="h-6 w-40 animate-pulse bg-muted rounded" />
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="h-3 animate-pulse bg-muted rounded"
            style={{ width: i % 5 === 4 ? "55%" : i % 3 === 0 ? "80%" : "100%" }}
          />
        ))}
      </div>

      {/* Right: detail panel */}
      <div className="w-80 flex-shrink-0 p-5 flex flex-col gap-5">
        {/* SOP info */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-20 animate-pulse bg-muted rounded" />
          <div className="h-6 w-56 animate-pulse bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-20 animate-pulse bg-muted rounded-full" />
            <div className="h-5 w-16 animate-pulse bg-muted rounded-full" />
          </div>
        </div>

        {/* Submitter */}
        <div className="bg-muted/30 rounded-lg p-4 flex flex-col gap-2">
          <div className="h-4 w-24 animate-pulse bg-muted rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
            <div className="h-4 w-32 animate-pulse bg-muted rounded" />
          </div>
        </div>

        {/* History */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse bg-muted rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1 border-l-2 border-border pl-3 py-1">
              <div className="h-3 w-40 animate-pulse bg-muted rounded" />
              <div className="h-3 w-24 animate-pulse bg-muted rounded" />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          <div className="h-10 w-full animate-pulse bg-muted rounded-lg" />
          <div className="h-10 w-full animate-pulse bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}
