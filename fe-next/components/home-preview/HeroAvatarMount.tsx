'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { retryImport } from '@/utils/retryImport';

/**
 * Runtime-only loader for HeroAvatarIsland. Rendered by PageClient — a file
 * LandingView never imports — so the landing module graph (and
 * LandingView.bundleGraph.test.ts, which follows static imports AND literal
 * import() specifiers from LandingView.tsx) can never reach the avatar chunks.
 *
 * Raw `import()` inside useEffect, deliberately NOT next/dynamic: a dynamic()
 * chunk rendered on mount is still associated with the route and emitted as a
 * first-paint <script> on the landing HTML. A plain runtime import() fetches
 * the chunk after paint, invisible to the server HTML. retryImport covers the
 * stale-chunk-after-deploy case, same as the FTUE loader. The avatar was
 * already post-mount on this page (HomePreview gates it behind `mounted`), so
 * nothing visual changes — the hero slot keeps its fixed size, so no CLS.
 */
export function HeroAvatarMount() {
  const [Island, setIsland] = useState<ComponentType | null>(null);

  useEffect(() => {
    let alive = true;
    retryImport(() => import('@/components/home-preview/HeroAvatarIsland'))()
      .then((mod) => {
        if (alive) setIsland(() => mod.default);
      })
      .catch(() => {
        // Unrecoverable (non-chunk) failure: the hero keeps its sized slots and
        // simply shows no avatar, never a broken first paint.
      });
    return () => {
      alive = false;
    };
  }, []);

  return Island ? <Island /> : null;
}
