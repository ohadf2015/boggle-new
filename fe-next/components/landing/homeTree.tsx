'use client';

/**
 * Homepage tree selection: fresh visitors get the fresh page, returning users
 * keep today's tree. Picked BEFORE paint, with no hydration mismatch:
 *
 * - Server: both trees render live (tree = 'ssr'). HomeTreeBoot's inline script
 *   sets `html[data-home]` from the shared predicate while the parser is still
 *   above the trees, and its CSS shows exactly one. No script / no JS = fresh.
 * - Client: the tree is decided once per mount (same predicate). The chosen
 *   tree hydrates normally. The other renders the SAME wrapper with an empty
 *   `dangerouslySetInnerHTML` + suppressHydrationWarning, so React keeps the
 *   server markup (hidden by CSS) without hydrating it: its hooks, fetches,
 *   ads and music never mount.
 */
import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { hasCompletedOnboarding, hasSupabaseSession } from '@/utils/onboardingStorage';
import { HOME_TREE_SCRIPT } from '@/utils/returningVisitor';

export type HomeTreeName = 'fresh' | 'returning';
export type HomeTree = HomeTreeName | 'ssr';

/**
 * Lives in a <style> inside LandingView, so every rule applies only while the
 * homepage is mounted (a client navigation away removes it).
 *
 * - The two trees: exactly one is displayed.
 * - `[data-home-only]`: single-audience blocks outside the tree slots, in
 *   HomepageContentSection: the finale PLAY band ("fresh") and the tab-bar
 *   reserve ("returning"). Returning-only is hidden by default, so no script
 *   (crawlers, no JS) reads as fresh, like the trees.
 * - The app tab bar (GlobalBottomNav: QUESTS / FRIENDS / HOME) is hidden for
 *   fresh visitors: the logged-out homepage is a marketing page (the Duolingo
 *   bar has no tab bar), and in a phone capture it sat pinned over the section
 *   under the hero. `visibility`, not `display`: display:none would make the
 *   nav measure 0 and cache lc_bottom_nav_h=0, which the layout's prime
 *   script replays on the NEXT page as a bottom-reserve jump.
 */
const TREE_CSS =
  '[data-home-tree="returning"]{display:none}' +
  'html[data-home="returning"] [data-home-tree="returning"]{display:contents}' +
  'html[data-home="returning"] [data-home-tree="fresh"]{display:none}' +
  'html[data-home="returning"] [data-home-only="fresh"]{display:none}' +
  '[data-home-only="returning"]{display:none}' +
  'html[data-home="returning"] [data-home-only="returning"]{display:block}' +
  'html:not([data-home="returning"]) [data-global-bottom-nav]{visibility:hidden}';

/** Stable identity: a new object each render would make React rewrite innerHTML. */
const INERT_HTML = { __html: '' };

/**
 * Client-side decision. Same predicate as `isReturningVisitor()` (spelled out
 * via its two halves so module mocks that stub only those resolve the same way).
 * Also syncs `html[data-home]`: after a client-side navigation the inline
 * script never ran, and the attribute may be stale from an earlier load.
 */
export function resolveClientHomeTree(): HomeTreeName {
  const tree: HomeTreeName = hasCompletedOnboarding() || hasSupabaseSession() ? 'returning' : 'fresh';
  try {
    document.documentElement.setAttribute('data-home', tree);
  } catch {
    /* no document */
  }
  return tree;
}

/** 'ssr' on the server; the visitor's tree on the client, frozen for the mount. */
export function useHomeTree(): HomeTree {
  const [tree] = useState<HomeTree>(() =>
    typeof window === 'undefined' ? 'ssr' : resolveClientHomeTree()
  );
  return tree;
}

const noopSubscribe = () => () => {};

/** True during SSR and hydration, false afterwards and on client navigations. */
function useIsHydrating(): boolean {
  return useSyncExternalStore(noopSubscribe, () => false, () => true);
}

/**
 * Display rules + the pre-paint script. Must render BEFORE both tree slots.
 * The script only exists in server HTML (and the hydration pass that adopts
 * it): React never executes a client-created <script>, and creating one logs a
 * dev error, so client navigations rely on resolveClientHomeTree instead.
 */
export function HomeTreeBoot() {
  const hydrating = useIsHydrating();
  return (
    <>
      <style>{TREE_CSS}</style>
      {hydrating && (
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: HOME_TREE_SCRIPT }} />
      )}
    </>
  );
}

interface HomeTreeSlotProps {
  tree: HomeTree;
  which: HomeTreeName;
  children: ReactNode;
}

export function HomeTreeSlot({ tree, which, children }: HomeTreeSlotProps) {
  if (tree === 'ssr' || tree === which) {
    return <div data-home-tree={which}>{children}</div>;
  }
  return <div data-home-tree={which} suppressHydrationWarning dangerouslySetInnerHTML={INERT_HTML} />;
}
