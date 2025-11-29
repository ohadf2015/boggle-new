'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
