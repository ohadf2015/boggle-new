'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { buildUnlockReveal, getNextUnlock, type LevelUpLike } from '@/lib/avatar/revealTrigger';
import PostGameUnlockStrip from './PostGameUnlockStrip';

// The reveal pulls the avatar renderer — load it only when the chip is tapped.
const ConnectedUnlockReveal = dynamic(() => import('./ConnectedUnlockReveal'), { ssr: false });

export interface PostGameUnlocksProps {
  /** This game's level-up payload (in memory), if any. */
  levelUp: LevelUpLike | null;
  /** The player's level after this game; undefined when unknown (guest). */
  level: number | undefined;
}

/**
 * Results-screen hook-in: chip + next-unlock hint. The automatic reveal is
 * driven by the results modal queue (ResultsModals); this chip is the
 * user-initiated replay, so it shows the full payload even after the auto
 * reveal played and never re-fires telemetry.
 */
export default function PostGameUnlocks({ levelUp, level }: PostGameUnlocksProps) {
  const [open, setOpen] = useState(false);
  const reveal = useMemo(() => buildUnlockReveal(levelUp, { includeRevealed: true }), [levelUp]);
  const next = useMemo(() => (level === undefined ? null : getNextUnlock(level)), [level]);

  if (level === undefined && !reveal) return null;

  return (
    <>
      <PostGameUnlockStrip reveal={reveal} next={next} onOpen={() => setOpen(true)} />
      {open && reveal && <ConnectedUnlockReveal reveal={reveal} replay onClose={() => setOpen(false)} />}
    </>
  );
}
