import { PageLoader } from '@/components/ui/PageLoader';

/**
 * Route-loading fallback for game and app routes. Each of those folders has a
 * one-line loading.tsx re-exporting this. There is deliberately no
 * app/[locale]/loading.tsx: a boundary there also wraps the homepage and the
 * content pages, and on a dynamic render it streams their h1 inside a hidden
 * segment that only shows when React's reveal script runs.
 *
 * `priority={false}`: the loader is on screen for a moment, so its mascot must
 * not be a high-priority preload competing with the real first paint.
 */
export default function RouteLoading() {
  return (
    // min-h-[100svh], not h-full: a short loader leaves the footer in view and
    // the swap to real content shoves it (was CLS 1.0 on the landing page).
    <div className="flex-1 flex flex-col bg-neo-navy page-content-safe min-h-[100svh]">
      <PageLoader priority={false} />
    </div>
  );
}
