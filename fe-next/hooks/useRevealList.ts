'use client';

import { useState, useCallback, useMemo } from 'react';

export interface RevealList<T> {
  /** Items to render right now — first `initialCount`, or all when expanded. */
  visible: T[];
  /** True when the full list is longer than the cap (i.e. a toggle is useful). */
  hasMore: boolean;
  /** Whether the list is currently fully expanded. */
  showAll: boolean;
  /** Flip between collapsed and expanded. */
  toggle: () => void;
  /** How many items are hidden while collapsed (0 when expanded or no overflow). */
  hiddenCount: number;
}

/**
 * useRevealList — the "show top N + expand" declutter primitive.
 *
 * Keeps results word lists scannable: render a handful of highlights, let the
 * curious tap to see the rest. Pure state logic so both UniqueWordsSection and
 * MissedWords share one source of truth (default cap = 3).
 */
export function useRevealList<T>(items: T[], initialCount = 3): RevealList<T> {
  const [showAll, setShowAll] = useState(false);

  const toggle = useCallback(() => setShowAll((prev) => !prev), []);

  const visible = useMemo(
    () => (showAll ? items : items.slice(0, initialCount)),
    [items, showAll, initialCount],
  );

  const hasMore = items.length > initialCount;
  const hiddenCount = showAll ? 0 : Math.max(0, items.length - initialCount);

  return { visible, hasMore, showAll, toggle, hiddenCount };
}

export default useRevealList;
