export default function EquipmentDetailLoading() {
  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Back link + header */}
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 animate-pulse bg-muted rounded" />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <div className="h-7 w-56 animate-pulse bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse bg-muted rounded" />
              <div className="h-5 w-20 animate-pulse bg-muted rounded-full" />
            </div>
          </div>
          <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Photo */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="h-48 w-full animate-pulse bg-muted" />
          <div className="p-4 flex flex-col gap-2">
            <div className="h-4 w-32 animate-pulse bg-muted rounded" />
            <div className="h-3 w-24 animate-pulse bg-muted rounded" />
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="h-3 w-20 animate-pulse bg-muted rounded" />
              <div className="h-4 w-32 animate-pulse bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* PM Tasks */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <div className="h-5 w-32 animate-pulse bg-muted rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex flex-col gap-1">
              <div className="h-3 w-40 animate-pulse bg-muted rounded" />
              <div className="h-3 w-28 animate-pulse bg-muted rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-5 w-20 animate-pulse bg-muted rounded-full" />
              <div className="h-8 w-24 animate-pulse bg-muted rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
