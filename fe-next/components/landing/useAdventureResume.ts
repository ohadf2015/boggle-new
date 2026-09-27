'use client';

/**
 * Is there an adventure run to continue? Reads the SAME sessionStorage the
 * world view's RunBanner reads (`adv-run-w<N>`) — no second store, no fetch.
 *
 * Deliberately effect-only: the homepage renders on the server, so the cube
 * must paint its resting state first and the resume chrome arrives after
 * hydration. Nothing it renders may change the tile's size (see ModeResumeChip).
 */
import { useEffect, useState } from 'react';
import { WORLD_COUNT } from '@/lib/adventure/play/levels';
import { readRun } from '@/components/adventure/play/runStorage';
import { pickAdventureResume, type AdventureResume, type StoredWorldRun } from '@/lib/landing/adventureResume';

export function useAdventureResume(enabled = true): AdventureResume | null {
  const [resume, setResume] = useState<AdventureResume | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const stored: StoredWorldRun[] = [];
    for (let world = 1; world <= WORLD_COUNT; world++) {
      const found = readRun(world);
      if (found) stored.push({ world, run: found.run });
    }
    setResume(pickAdventureResume(stored));
  }, [enabled]);

  return resume;
}

export default useAdventureResume;
