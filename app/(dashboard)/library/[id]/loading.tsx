export default function SopViewerLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab strip */}
      <div className="flex items-center gap-1 px-4 pt-4 border-b border-border">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 w-36 animate-pulse bg-muted rounded-t-md" />
        ))}
      </div>

      {/* Viewer area */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Document content */}
        <div className="flex-1 p-8 flex flex-col gap-4 overflow-hidden">
          {/* Document header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-2">
              <div className="h-7 w-64 animate-pulse bg-muted rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-20 animate-pulse bg-muted rounded-full" />
                <div className="h-5 w-16 animate-pulse bg-muted rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
              <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
            </div>
          </div>

          {/* Document body lines */}
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="h-3 animate-pulse bg-muted rounded"
              style={{ width: i % 5 === 4 ? "60%" : i % 3 === 0 ? "85%" : "100%" }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
