export default function ChangeControlLoading() {
  return (
    <div className="flex flex-col gap-5 p-6">
      {/* CC Header */}
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 animate-pulse bg-muted rounded" />
          <div className="h-6 w-64 animate-pulse bg-muted rounded" />
          <div className="flex gap-3">
            <div className="h-3 w-32 animate-pulse bg-muted rounded" />
            <div className="h-3 w-28 animate-pulse bg-muted rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-6 w-24 animate-pulse bg-muted rounded-full" />
          <div className="h-3 w-36 animate-pulse bg-muted rounded" />
        </div>
      </div>

      {/* AI Delta Summary */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
        <div className="h-5 w-36 animate-pulse bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-3 animate-pulse bg-muted rounded" style={{ width: i === 2 ? "60%" : "100%" }} />
        ))}
      </div>

      {/* Diff Viewer */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          {["Previous Version", "New Version"].map((label, i) => (
            <div key={i} className="flex-1 p-3 flex flex-col gap-3">
              <div className="h-4 w-32 animate-pulse bg-muted rounded" />
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-3 animate-pulse bg-muted rounded" style={{ width: j % 3 === 2 ? "70%" : "100%" }} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Grid */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
        <div className="h-5 w-40 animate-pulse bg-muted rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-border rounded-lg p-3 flex flex-col gap-2">
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
              <div className="h-3 w-24 animate-pulse bg-muted rounded" />
              <div className="h-3 w-16 animate-pulse bg-muted rounded" />
              <div className="h-5 w-16 animate-pulse bg-muted rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
