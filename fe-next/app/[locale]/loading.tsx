/**
 * Loading component for page transitions
 * Uses modern screen-fit layout consistent with landing page
 * Pure CSS animations for instant paint - no JS hydration required
 */
export default function Loading() {
  return (
    <div className="screen-fit flex items-center justify-center bg-neo-navy">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 bg-neo-lime rounded-full animate-bounce"
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
