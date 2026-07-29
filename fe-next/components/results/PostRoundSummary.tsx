'use client';

import React, { useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  midRoundEventQueueStore,
  type MidRoundEvent,
} from '@/hooks/useMidRoundEventQueue';

interface Counts {
  joined: number;
  left: number;
  achievements: number;
}

function tally(events: MidRoundEvent[]): Counts {
  const counts: Counts = { joined: 0, left: 0, achievements: 0 };
  for (const e of events) {
    if (e.kind === 'playerJoined') counts.joined += 1;
    else if (e.kind === 'playerLeft') counts.left += 1;
    else if (e.kind === 'achievementUnlocked') counts.achievements += 1;
  }
  return counts;
}

/**
 * Drains the mid-round event queue on first mount and renders a compact
 * chip strip of "what you missed during your round". One-shot — remounts
 * see an empty queue and render nothing. Mount once on results page.
 */
export function PostRoundSummary(): React.JSX.Element | null {
  const { t, dir } = useLanguage();

  // Snapshot + drain exactly once on first mount.
  const snapshotRef = useRef<MidRoundEvent[] | null>(null);
  if (snapshotRef.current === null) {
    snapshotRef.current = midRoundEventQueueStore.getState().drain();
  }

  const counts = useMemo(() => tally(snapshotRef.current ?? []), []);

  const total = counts.joined + counts.left + counts.achievements;
  if (total === 0) return null;

  return (
    <div
      data-testid="post-round-summary"
      dir={dir}
      className="rounded-neo border-3 border-neo-black bg-neo-navy-light/80 p-3 text-sm"
    >
      <h4 className="mb-2 font-neo-display font-black uppercase text-neo-white">
        {t('multiplayer.postRound.title')}
      </h4>
      <div className="flex flex-wrap gap-2">
        {counts.joined > 0 && (
          <span className="rounded-full border-2 border-neo-black bg-neo-cyan px-3 py-1 font-bold text-neo-black">
            👋 {t('multiplayer.postRound.joined', { count: counts.joined })}
          </span>
        )}
        {counts.left > 0 && (
          <span className="rounded-full border-2 border-neo-black bg-neo-pink px-3 py-1 font-bold text-neo-black">
            🚪 {t('multiplayer.postRound.left', { count: counts.left })}
          </span>
        )}
        {counts.achievements > 0 && (
          <span className="rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 font-bold text-neo-black">
            🏆 {t('multiplayer.postRound.achievements', { count: counts.achievements })}
          </span>
        )}
      </div>
    </div>
  );
}

export default PostRoundSummary;
