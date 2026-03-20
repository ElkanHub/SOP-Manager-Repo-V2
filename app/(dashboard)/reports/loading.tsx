export default function ReportsLoading() {
  return (
    <div className="flex h-full gap-0">
      {/* Left: report selector */}
      <div className="w-64 flex-shrink-0 border-r border-border p-4 flex flex-col gap-2">
        <div className="h-5 w-20 animate-pulse bg-muted rounded mb-2" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 w-full animate-pulse bg-muted rounded-lg" />
        ))}
      </div>

      {/* Right: report content */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        {/* Report header + date filter */}
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 animate-pulse bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-36 animate-pulse bg-muted rounded-lg" />
            <div className="h-9 w-36 animate-pulse bg-muted rounded-lg" />
            <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex-1">
          <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
            {[120, 160, 100, 100, 120].map((w, i) => (
              <div key={i} className="h-3 animate-pulse bg-muted rounded" style={{ width: w }} />
            ))}
          </div>
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
              {[120, 160, 100, 100, 120].map((w, j) => (
                <div key={j} className="h-3 animate-pulse bg-muted rounded" style={{ width: w - (j === 1 ? 0 : 20) }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
