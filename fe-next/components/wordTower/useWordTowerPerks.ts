'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  drawPerkChoices,
  perkModifiers,
  type PerkId,
  type PerkModifiers,
} from '@/lib/wordTower/perks';
import { mulberry32, fnv1aHash } from '@/lib/rng/seededRandom';

/**
 * useWordTowerPerks — owns the daily-run roguelike draft. When `enabled` (daily
 * mode), {@link offerDraft} opens a pick-1-of-3 at each height milestone, seeded
 * off the shared daily seed + the milestone index (so the same day offers the
 * same choices to everyone). {@link modifiers} folds the owned perks into one
 * effect object the crane + hazard sites read.
 */
export function useWordTowerPerks(enabled: boolean, seed: string) {
  const ownedRef = useRef<PerkId[]>([]);
  const [owned, setOwned] = useState<PerkId[]>([]);
  const [draft, setDraft] = useState<PerkId[] | null>(null);
  const draftedMilestones = useRef<Set<number>>(new Set());

  const offerDraft = useCallback((milestoneIdx: number) => {
    if (!enabled || draftedMilestones.current.has(milestoneIdx)) return;
    draftedMilestones.current.add(milestoneIdx);
    const rng = mulberry32(fnv1aHash(`${seed}:${milestoneIdx}`));
    const choices = drawPerkChoices(rng, ownedRef.current, 3);
    if (choices.length > 0) setDraft(choices);
  }, [enabled, seed]);

  const choose = useCallback((id: PerkId) => {
    ownedRef.current = ownedRef.current.includes(id)
      ? ownedRef.current
      : [...ownedRef.current, id];
    setOwned(ownedRef.current);
    setDraft(null);
  }, []);

  const skip = useCallback(() => setDraft(null), []);

  const modifiers: PerkModifiers = useMemo(() => perkModifiers(owned), [owned]);

  return { owned, draft, offerDraft, choose, skip, modifiers };
}
