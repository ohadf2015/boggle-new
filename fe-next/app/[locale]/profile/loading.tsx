'use client';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header skeleton */}
      <div className="h-16 bg-slate-800/50 border-b border-slate-700" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile header skeleton */}
        <div className="rounded-2xl p-6 mb-6 bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-6">
            {/* Avatar skeleton */}
            <div className="w-20 h-20 bg-slate-700/50 rounded-full animate-pulse" />
            {/* Name skeleton */}
            <div className="flex-1">
              <div className="h-8 w-48 bg-slate-700/50 rounded mb-2 animate-pulse" />
              <div className="h-4 w-32 bg-slate-700/50 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* XP Progress skeleton */}
        <div className="rounded-2xl p-6 mb-6 bg-slate-800/50 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-32 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-700/50 rounded animate-pulse" />
          </div>
          <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl p-4 bg-slate-800/50 border border-slate-700">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-slate-700/50 rounded mb-2 animate-pulse" />
                <div className="h-8 w-16 bg-slate-700/50 rounded mb-1 animate-pulse" />
                <div className="h-3 w-12 bg-slate-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Ranked progress skeleton */}
        <div className="rounded-2xl p-6 bg-slate-800/50 border border-slate-700">
          <div className="h-6 w-40 bg-slate-700/50 rounded mb-4 animate-pulse" />
          <div className="h-4 w-full bg-slate-700/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
