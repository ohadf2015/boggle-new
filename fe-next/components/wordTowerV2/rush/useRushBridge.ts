'use client';

import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback, useRef } from 'react';
import type { Perks } from '@/lib/wordTowerV2/estate';
import type { BlockTrait, PerkId } from '@/lib/wordTowerV2/rush/types';
import type { Phase } from '../useTowerRun';
import { NEUTRAL_RUSH_MODS, perfectWindowMult } from './rushHelpers';
import type { RushApi } from './useRush';

interface Args {
  rush: RushApi | undefined;
  hangingRef: MutableRefObject<{ id: string } | null>;
  perksRef: MutableRefObject<Perks>;
  setPhase: Dispatch<SetStateAction<Phase>>;
}

/** The run loop's side of Rush: per-block traits, the draft pause, and the one window product. Neutral without `rush`. */
export function useRushBridge({ rush, hangingRef, perksRef, setPhase }: Args) {
  const rushRef = useRef(rush);
  rushRef.current = rush;
  const traitRef = useRef(new Map<string, BlockTrait>());
  const draftingRef = useRef(false);

  const rushMods = useCallback(() => rushRef.current?.modsRef.current ?? NEUTRAL_RUSH_MODS, []);
  const getTrait = useCallback((id: string) => traitRef.current.get(id), []);

  const windowMultFor = useCallback(
    (trait: BlockTrait | undefined) => perfectWindowMult(perksRef.current.perfectWindowMult, rushMods().perfectWindowMul, trait),
    [perksRef, rushMods],
  );

  const getPerfectWindowMult = useCallback(() => {
    const hanging = hangingRef.current;
    return windowMultFor(hanging ? traitRef.current.get(hanging.id) : rushRef.current?.slots[0]?.trait);
  }, [hangingRef, windowMultFor]);

  const takeTrait = useCallback((id: string) => {
    const trait = rushRef.current?.takeTrait() ?? 'plain';
    traitRef.current.set(id, trait);
    return trait;
  }, []);

  const returnTrait = useCallback((id: string) => {
    const trait = traitRef.current.get(id);
    traitRef.current.delete(id);
    if (trait) rushRef.current?.returnTrait(trait);
  }, []);

  /** Call only when nothing hangs and no landing is pending: the draft never interrupts a drop. */
  const maybeOpenDraft = useCallback(() => {
    const r = rushRef.current;
    if (draftingRef.current || !r?.hasDraftDue() || !r.openDraft()) return;
    draftingRef.current = true;
    setPhase((p) => (p === 'composing' ? 'draft' : p));
  }, [setPhase]);

  const pickPerk = useCallback(
    (id: PerkId) => {
      if (!draftingRef.current || rushRef.current?.pickPerk(id) !== 'done') return;
      draftingRef.current = false;
      setPhase((p) => (p === 'draft' ? 'composing' : p));
    },
    [setPhase],
  );

  const resetRush = useCallback((seed: number) => {
    rushRef.current?.reset(seed);
    traitRef.current = new Map();
    draftingRef.current = false;
  }, []);

  return { rushRef, traitRef, draftingRef, rushMods, getTrait, windowMultFor, getPerfectWindowMult, takeTrait, returnTrait, maybeOpenDraft, pickPerk, resetRush };
}
