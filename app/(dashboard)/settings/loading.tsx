export default function SettingsLoading() {
  return (
    <div className="flex flex-col gap-5 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="h-7 w-24 animate-pulse bg-muted rounded" />

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-border pb-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse bg-muted rounded-t-md" />
        ))}
      </div>

      {/* Tab content */}
      <div className="flex flex-col gap-6 pt-2">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 animate-pulse bg-muted rounded-full" />
          <div className="h-9 w-28 animate-pulse bg-muted rounded-lg" />
        </div>

        {/* Form fields */}
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-3 w-24 animate-pulse bg-muted rounded" />
            <div className="h-10 w-full animate-pulse bg-muted rounded-lg" />
          </div>
        ))}

        {/* Signature preview */}
        <div className="flex flex-col gap-2">
          <div className="h-3 w-28 animate-pulse bg-muted rounded" />
          <div className="h-24 w-48 animate-pulse bg-muted rounded-lg" />
          <div className="h-9 w-32 animate-pulse bg-muted rounded-lg" />
        </div>

        {/* Save button */}
        <div className="h-10 w-28 animate-pulse bg-muted rounded-lg" />
      </div>
    </div>
  )
}
