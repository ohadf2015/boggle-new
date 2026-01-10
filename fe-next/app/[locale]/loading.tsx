/**
 * Loading component for page transitions
 * Uses pure CSS animations for instant paint - no JS hydration required
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-neo-navy dark:via-neo-navy-light dark:to-neo-navy">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 bg-neo-yellow rounded-full animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '600ms' }}
        />
        <div
          className="w-3 h-3 bg-neo-cyan rounded-full animate-bounce"
          style={{ animationDelay: '150ms', animationDuration: '600ms' }}
        />
        <div
          className="w-3 h-3 bg-neo-pink rounded-full animate-bounce"
          style={{ animationDelay: '300ms', animationDuration: '600ms' }}
        />
      </div>
    </div>
  );
}
