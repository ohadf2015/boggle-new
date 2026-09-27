'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { PlacedTile } from '@/lib/word-craft/types';
import type { Axis } from '@/lib/word-craft/placement';

export interface WordCraftLiveRegionProps {
  pending: PlacedTile[];
  axis: Axis;
  /** Localized strings — caller passes them so we stay i18n-clean. */
  labels: {
    /** "{letter} placed at row {row} column {col}" */
    placed: (letter: string, row: number, col: number) => string;
    /** "{letter} returned to rack" */
    recalled: (letter: string) => string;
    /** "Across direction locked" / "Down direction locked" */
    axisLocked: (axis: 'h' | 'v') => string;
    /** "Word direction unlocked" — fired when pending shrinks back below 2 */
    axisUnlocked: string;
  };
}

/**
 * Polite live-region narrator for screen readers.
 *
 * Diffs `pending` placement deltas + axis transitions into short text
 * announcements. We render the message into an `aria-live="polite"` div so
 * AT users hear placements without disrupting the visual flow.
 *
 * Keeping this in its own component means React only re-renders the live
 * region when the announcement string changes — the rest of the page tree
 * is unaffected.
 */
function WordCraftLiveRegionImpl({ pending, axis, labels }: WordCraftLiveRegionProps) {
  const prevPendingRef = useRef<PlacedTile[]>([]);
  const prevAxisRef = useRef<Axis>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const prev = prevPendingRef.current;
    const next = pending;

    // Diff added vs removed by rackTileId (stable identity).
    const prevById = new Map(prev.map((p) => [p.rackTileId, p]));
    const nextById = new Map(next.map((p) => [p.rackTileId, p]));

    const added: PlacedTile[] = [];
    for (const [id, p] of nextById) {
      if (!prevById.has(id)) added.push(p);
    }
    const removed: PlacedTile[] = [];
    for (const [id, p] of prevById) {
      if (!nextById.has(id)) removed.push(p);
    }

    let msg = '';
    if (added.length > 0) {
      const a = added[0];
      msg = labels.placed(a.letter, a.row + 1, a.col + 1);
    } else if (removed.length > 0) {
      msg = labels.recalled(removed[0].letter);
    }

    if (axis !== prevAxisRef.current) {
      if (axis === 'h' || axis === 'v') {
        msg = msg ? `${msg}. ${labels.axisLocked(axis)}` : labels.axisLocked(axis);
      } else if (prevAxisRef.current !== null) {
        msg = msg ? `${msg}. ${labels.axisUnlocked}` : labels.axisUnlocked;
      }
    }

    if (msg) setMessage(msg);
    prevPendingRef.current = next;
    prevAxisRef.current = axis;
  }, [pending, axis, labels]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-wc-live-region
      className="sr-only"
    >
      {message}
    </div>
  );
}

export const WordCraftLiveRegion = memo(WordCraftLiveRegionImpl);
