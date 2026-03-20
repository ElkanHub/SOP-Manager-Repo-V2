export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 animate-pulse bg-muted rounded" />
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
            </div>
            <div className="h-9 w-20 animate-pulse bg-muted rounded" />
            <div className="h-3 w-32 animate-pulse bg-muted rounded" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Activity feed skeleton */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
          <div className="h-5 w-32 animate-pulse bg-muted rounded" />
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-7 w-7 animate-pulse bg-muted rounded-full flex-shrink-0" />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="h-3 animate-pulse bg-muted rounded" style={{ width: `${60 + i * 5}%` }} />
                  <div className="h-3 w-20 animate-pulse bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming PM skeleton */}
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
          <div className="h-5 w-36 animate-pulse bg-muted rounded" />
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex flex-col gap-1">
                  <div className="h-3 w-40 animate-pulse bg-muted rounded" />
                  <div className="h-3 w-24 animate-pulse bg-muted rounded" />
                </div>
                <div className="h-6 w-20 animate-pulse bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
