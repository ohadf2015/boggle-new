'use client';

/**
 * Loading component for page transitions
 * FIXED: Uses theme-consistent backgrounds to prevent content flash during transitions
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-3">
          <div className="absolute inset-0 border-4 border-neo-yellow/30 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-neo-yellow rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 dark:text-gray-300 text-sm">Loading...</p>
      </div>
    </div>
  );
}
