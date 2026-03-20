export default function LibraryLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 animate-pulse bg-muted rounded" />
        <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse bg-muted rounded-md" />
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
          {[60, 180, 100, 80, 80, 100].map((w, i) => (
            <div key={i} className="h-3 animate-pulse bg-muted rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
            <div className="h-3 w-14 animate-pulse bg-muted rounded" />
            <div className="h-3 flex-1 animate-pulse bg-muted rounded" />
            <div className="h-5 w-24 animate-pulse bg-muted rounded-full" />
            <div className="h-5 w-16 animate-pulse bg-muted rounded-full" />
            <div className="h-3 w-16 animate-pulse bg-muted rounded" />
            <div className="h-3 w-20 animate-pulse bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
