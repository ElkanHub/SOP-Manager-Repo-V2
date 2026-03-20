export default function ApprovalsLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="h-7 w-48 animate-pulse bg-muted rounded" />

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 animate-pulse bg-muted rounded-md" />
        ))}
      </div>

      {/* Approval cards */}
      <div className="flex flex-col gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <div className="h-4 w-16 animate-pulse bg-muted rounded" />
                <div className="h-5 w-20 animate-pulse bg-muted rounded-full" />
              </div>
              <div className="h-5 w-72 animate-pulse bg-muted rounded" />
              <div className="flex gap-3">
                <div className="h-3 w-28 animate-pulse bg-muted rounded" />
                <div className="h-3 w-24 animate-pulse bg-muted rounded" />
              </div>
            </div>
            <div className="h-9 w-24 animate-pulse bg-muted rounded-lg flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
