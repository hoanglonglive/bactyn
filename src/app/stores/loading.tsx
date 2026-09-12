export default function StoresLoading() {
  return (
    <div className="min-h-dvh bg-black p-4 max-w-5xl mx-auto space-y-4 animate-pulse">
      {/* Header Skeleton */}
      <header className="flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20" />
          <div className="space-y-1">
            <div className="h-4 w-28 bg-white/15 rounded-md" />
            <div className="h-3 w-36 bg-white/10 rounded-md" />
          </div>
        </div>
      </header>

      {/* Stats Widgets Skeleton */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="h-16 rounded-2xl bg-white/5 border-0" />
        <div className="h-16 rounded-2xl bg-white/5 border-0" />
        <div className="h-16 rounded-2xl bg-white/5 border-0" />
      </div>

      {/* Search Toolbar Skeleton */}
      <div className="h-10 bg-white/5 rounded-2xl border-0" />

      {/* Store Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-white/5 border-0 aspect-[4/3] overflow-hidden"
          >
            <div className="w-full h-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
