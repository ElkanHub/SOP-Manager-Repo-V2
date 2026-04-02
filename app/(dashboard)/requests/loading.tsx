export default function RequestsLoading() {
  return (
    <div className="flex flex-col min-h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted rounded-lg" />
          <div className="w-36 h-6 bg-muted rounded" />
        </div>
        <div className="w-28 h-9 bg-muted rounded-lg" />
      </div>

      {/* Tab strip skeleton */}
      <div className="px-6 pt-4 pb-0 flex gap-2">
        {[80, 100, 80, 80, 80].map((w, i) => (
          <div key={i} className="h-8 bg-muted rounded-lg" style={{ width: w }} />
        ))}
      </div>

      {/* Card skeletons */}
      <div className="px-6 py-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted rounded-xl h-40 w-full" />
        ))}
      </div>
    </div>
  )
}
