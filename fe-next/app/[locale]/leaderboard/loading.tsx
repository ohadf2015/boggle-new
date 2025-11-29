'use client';

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header skeleton */}
      <div className="h-16 bg-slate-800/50 border-b border-slate-700" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-10 w-64 bg-slate-700/50 rounded-lg mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-32 bg-slate-700/50 rounded mx-auto animate-pulse" />
        </div>

        {/* Leaderboard table skeleton */}
        <div className="rounded-xl overflow-hidden bg-slate-800/50 border border-slate-700">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-700/50">
            <div className="col-span-1 h-4 bg-slate-600/50 rounded animate-pulse" />
            <div className="col-span-5 h-4 bg-slate-600/50 rounded animate-pulse" />
            <div className="col-span-3 h-4 bg-slate-600/50 rounded animate-pulse" />
            <div className="col-span-3 h-4 bg-slate-600/50 rounded animate-pulse" />
          </div>

          {/* Row skeletons */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 border-t border-slate-700">
              <div className="col-span-1 flex justify-center">
                <div className="w-8 h-8 bg-slate-700/50 rounded-full animate-pulse" />
              </div>
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-700/50 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse" />
              </div>
              <div className="col-span-3 flex justify-end items-center">
                <div className="h-4 w-16 bg-slate-700/50 rounded animate-pulse" />
              </div>
              <div className="col-span-3 flex justify-end items-center">
                <div className="h-4 w-12 bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
