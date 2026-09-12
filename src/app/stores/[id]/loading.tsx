export default function StoreDetailLoading() {
  return (
    <div className="min-h-dvh bg-black animate-pulse">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-30 glass border-b border-white/5 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-36 bg-white/15 rounded-md" />
            <div className="h-3 w-24 bg-white/10 rounded-md" />
          </div>
          <div className="w-20 h-8 rounded-xl bg-amber-400/20 border-0" />
        </div>

        {/* Search Bar Skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-9 flex-1 bg-white/5 rounded-xl border-0" />
          <div className="h-9 w-16 bg-white/5 rounded-xl border-0" />
        </div>

        {/* Status Filter Skeleton */}
        <div className="flex items-center gap-1.5 overflow-hidden py-1">
          <div className="h-7 w-16 rounded-full bg-white/10 flex-shrink-0" />
          <div className="h-7 w-24 rounded-full bg-emerald-500/15 flex-shrink-0" />
          <div className="h-7 w-24 rounded-full bg-amber-500/15 flex-shrink-0" />
          <div className="h-7 w-20 rounded-full bg-sky-500/15 flex-shrink-0" />
        </div>
      </header>

      {/* Main Grid Skeleton */}
      <main className="px-3 py-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/5 border-0 overflow-hidden aspect-[3/4] relative"
            >
              <div className="w-full h-full bg-gradient-to-t from-black/60 via-white/5 to-white/10" />
              <div className="absolute top-2 left-2 w-16 h-5 rounded-full bg-white/15" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
