export default function DashboardLoading() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* Status Strip Skeleton */}
      <div className="bg-slate-100 dark:bg-slate-800/50 border-y border-border px-4 md:px-6 py-2.5 flex items-center gap-6">
        <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="hidden sm:block w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-0 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6 rounded-b-none border-t-4 border-t-slate-200 dark:border-t-slate-800">
            <div className="flex justify-between items-start">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="mt-4 h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="mt-4 h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* Quick Actions Bar Skeleton */}
      <div className="px-4 md:px-0 mt-2">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-card border border-border/50 rounded-xl p-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col gap-1.5">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-2 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 md:px-0 mt-6">
        {/* Compliance Health Card Skeleton */}
        <div className="bg-card border border-border shadow-sm rounded-xl p-6 lg:col-span-1">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
          <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-8" />
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Change Controls Tracker Skeleton */}
        <div className="bg-card border border-border shadow-sm rounded-xl p-6 lg:col-span-2">
          <div className="flex justify-between mb-8">
            <div>
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
              <div className="h-3 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex justify-between mb-4">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="flex justify-between mb-2">
                  <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operations Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 md:px-0 mt-6 pb-12">
        <div className="bg-card border border-border shadow-sm rounded-xl p-6">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-border/50">
                <div className="flex gap-4 items-center">
                  <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-card border border-border shadow-sm rounded-xl p-6">
          <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                <div className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
