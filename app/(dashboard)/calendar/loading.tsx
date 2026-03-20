export default function CalendarLoading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse bg-muted rounded-md" />
          <div className="h-7 w-36 animate-pulse bg-muted rounded" />
          <div className="h-8 w-8 animate-pulse bg-muted rounded-md" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse bg-muted rounded-lg" />
          <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="h-5 animate-pulse bg-muted rounded" />
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-2 min-h-[90px] flex flex-col gap-1">
            <div className="h-5 w-5 animate-pulse bg-muted rounded-full self-end" />
            {i % 5 === 0 && <div className="h-4 animate-pulse bg-muted rounded" />}
            {i % 7 === 1 && <div className="h-4 animate-pulse bg-muted rounded" />}
          </div>
        ))}
      </div>
    </div>
  )
}
