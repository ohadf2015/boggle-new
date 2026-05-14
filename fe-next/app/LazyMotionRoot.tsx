'use client';

import { LazyMotion, domMax } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * App-wide LazyMotion provider.
 *
 * Every component was migrated from `motion` to `m`, so this single `domMax`
 * feature bundle is the only framer-motion feature payload the app ships — the
 * full `motion` engine is tree-shaken out of the common chunk.
 *
 * `domMax` (not `domAnimation`) is required: the render tree uses drag
 * (MobileGameDrawer), layout/layoutId (RoomListView, TvLeaderboard, TvPlayerCard)
 * and useMotionValue/animate (TvResultsWinnersPodium).
 *
 * Mounted at the true root (`app/layout.tsx`) so it also covers `party-screen`,
 * which bypasses `EssentialProviders`.
 */
export function LazyMotionRoot({ children }: { children: ReactNode }) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>;
}
