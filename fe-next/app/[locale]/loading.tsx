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
    <div className="flex-1 flex flex-col bg-neo-navy page-content-safe h-full">
      <PageLoader />
    </div>
  );
}
