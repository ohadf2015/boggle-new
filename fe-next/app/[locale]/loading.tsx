import { PageLoader } from '@/components/ui/PageLoader';

/**
 * Generic route-loading boundary for the [locale] segment.
 *
 * In the App Router a loading.tsx is inherited by EVERY nested child route that
 * lacks its own. This file therefore covers ~90 routes (practice, blast,
 * crossword, daily, friends, all SEO landing pages, …), so it must be
 * page-agnostic: the mascot PageLoader, the same loader leaderboard/profile/
 * multiplayer already use.
 *
 * The homepage has its own (home)/loading.tsx (a random dancing mascot), scoped
 * to the (home) route group so it doesn't leak down to these siblings.
 */
export default function Loading() {
  return (
    // min-h-[100svh] (not h-full): `h-full` collapses to content height when
    // the flex parent has no definite height, leaving a SHORT loader with the
    // footer visible in the viewport — the swap to real content then shoves
    // the footer while on-screen (was the CLS 1.0 on the landing page). A
    // viewport-tall loader keeps the footer below the fold during load, so the
    // content swap happens off-screen and counts ~zero CLS.
    <div className="flex-1 flex flex-col bg-neo-navy page-content-safe min-h-[100svh]">
      <PageLoader />
    </div>
  );
}
