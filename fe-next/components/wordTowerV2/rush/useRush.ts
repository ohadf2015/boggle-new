'use client';

import { type MutableRefObject, useCallback, useMemo, useRef, useState } from 'react';
import { floorsAt } from '@/lib/wordTowerV2/biomes';
import type { LandingQuality } from '@/lib/wordTowerV2/landing';
import { draftDue } from '@/lib/wordTowerV2/rush/draftTrigger';
import { combineMods, mixSeed, rollDraft } from '@/lib/wordTowerV2/rush/perks';
import { rankFor } from '@/lib/wordTowerV2/rush/rankLadder';
import { crossedRivals, pickRivals } from '@/lib/wordTowerV2/rush/rivals';
import { type TraitQueue, createTraitQueue } from '@/lib/wordTowerV2/rush/traits';
import type { BlockTrait, GhostRival, NextUpSlot, Perk, PerkId, PerkMods, RankState } from '@/lib/wordTowerV2/rush/types';
import { type RushBoardRow, boardToRivalRows, sameRivals, slotsWithCarry } from './rushHelpers';

export type { RushBoardRow } from './rushHelpers';

export interface RushEvent {
  key: number;
}

export interface RushApi {
  owned: PerkId[];
  mods: PerkMods;
  modsRef: MutableRefObject<PerkMods>;
  slots: NextUpSlot[];
  draftOffer: Perk[] | null;
  draftFloor: number | null;
  rank: RankState;
  rankUp: (RushEvent & { tierId: string }) | null;
  clearRankUp(): void;
  rivals: GhostRival[];
  overtake: (RushEvent & GhostRival) | null;
  shiftOvertake(): void;
  setBoard(rows: RushBoardRow[]): void;
  onPeak(peakM: number): void;
  baseline(peakM: number): void;
  hasDraftDue(): boolean;
  openDraft(): boolean;
  pickPerk(id: PerkId): PickResult;
  takeTrait(): BlockTrait;
  returnTrait(trait: BlockTrait): void;
  onLanding(quality: LandingQuality): void;
  consumeFreeRecovery(): boolean;
  reset(seed: number): void;
}

const NO_PERKS: PerkId[] = [];

/** `next`: another queued draft opened; `done`: drafting is over; `ignored`: that card was not on offer. */
export type PickResult = 'next' | 'done' | 'ignored';

/** Per-run Rush state: perks drafted every 5 peak floors, next-up traits, rank ladder and ghost rivals. In memory only. */
export function useRush(opts?: { daily?: boolean }): RushApi {
  const daily = !!opts?.daily;
  const seedRef = useRef(1);
  const modsRef = useRef<PerkMods>(combineMods(NO_PERKS));
  const goldWeightMul = useCallback(() => modsRef.current.goldChanceMul, []);
  const queueRef = useRef<TraitQueue>(createTraitQueue(mixSeed(1, 0), { goldWeightMul }));
  const carryRef = useRef<BlockTrait | null>(null);
  const ownedRef = useRef<PerkId[]>(NO_PERKS);
  const dueRef = useRef<number[]>([]);
  const lastFloorRef = useRef(0);
  const peakRef = useRef(0);
  const tierRef = useRef(0);
  const boardRef = useRef<{ name: string; score: number; id: string }[]>([]);
  const rivalsRef = useRef<GhostRival[]>([]);
  const recoveriesRef = useRef(0);
  const eventKeyRef = useRef(0);

  const [owned, setOwned] = useState<PerkId[]>(NO_PERKS);
  const [slots, setSlots] = useState<NextUpSlot[]>(() => queueRef.current.peek(3));
  const [draft, setDraft] = useState<{ offer: Perk[]; floor: number } | null>(null);
  const [rank, setRank] = useState<RankState>(() => rankFor(0));
  const [rankUp, setRankUp] = useState<RushApi['rankUp']>(null);
  const [rivals, setRivals] = useState<GhostRival[]>([]);
  const [overtakes, setOvertakes] = useState<(RushEvent & GhostRival)[]>([]);

  const refreshSlots = useCallback(() => setSlots(slotsWithCarry(queueRef.current, carryRef.current)), []);
  const nextKey = () => (eventKeyRef.current += 1);

  const repickRivals = useCallback(() => {
    const next = pickRivals(boardRef.current, peakRef.current);
    if (sameRivals(next, rivalsRef.current)) return;
    rivalsRef.current = next;
    setRivals(next);
  }, []);

  const syncRank = useCallback((announce: boolean) => {
    const next = rankFor(peakRef.current);
    setRank((shown) => (shown.tier === next.tier && Math.abs(shown.progress01 - next.progress01) < 0.01 ? shown : next));
    if (next.tier > tierRef.current && announce) setRankUp({ key: nextKey(), tierId: next.tierId });
    tierRef.current = Math.max(tierRef.current, next.tier);
  }, []);

  const onPeak = useCallback(
    (peakM: number) => {
      if (!(peakM > peakRef.current)) return;
      const prev = peakRef.current;
      peakRef.current = peakM;
      const floor = Math.floor(floorsAt(peakM));
      for (let f = lastFloorRef.current + 1; f <= floor; f++) {
        const due = draftDue(f - 1, f);
        if (due !== null) dueRef.current.push(due);
      }
      lastFloorRef.current = Math.max(lastFloorRef.current, floor);
      const passed = crossedRivals(prev, peakM, rivalsRef.current);
      if (passed.length) setOvertakes((q) => [...q, ...passed.map((r) => ({ ...r, key: nextKey() }))]);
      repickRivals();
      syncRank(true);
    },
    [repickRivals, syncRank],
  );

  const baseline = useCallback(
    (peakM: number) => {
      if (!(peakM > peakRef.current)) return;
      peakRef.current = peakM;
      lastFloorRef.current = Math.max(lastFloorRef.current, Math.floor(floorsAt(peakM)));
      repickRivals();
      syncRank(false);
    },
    [repickRivals, syncRank],
  );

  const setBoard = useCallback(
    (rows: RushBoardRow[]) => {
      boardRef.current = boardToRivalRows(rows);
      repickRivals();
    },
    [repickRivals],
  );

  const hasDraftDue = useCallback(() => dueRef.current.length > 0, []);

  const openDraft = useCallback(() => {
    const floor = dueRef.current.shift();
    if (floor === undefined) return false;
    // Daily boards stay fair: swing speed is scripted per drop there, so a swing card would be a dead pick.
    const exclude: PerkId[] = daily ? [...ownedRef.current, 'slowSwing'] : ownedRef.current;
    const offer = rollDraft(seedRef.current, floor, exclude);
    if (offer.length === 0) return openDraft();
    setDraft({ offer, floor });
    return true;
  }, [daily]);

  const draftRef = useRef(draft);
  draftRef.current = draft;

  const pickPerk = useCallback(
    (id: PerkId): PickResult => {
      if (!draftRef.current?.offer.some((p) => p.id === id)) return 'ignored';
      ownedRef.current = [...ownedRef.current, id];
      modsRef.current = combineMods(ownedRef.current);
      setOwned(ownedRef.current);
      draftRef.current = null;
      setDraft(null);
      return openDraft() ? 'next' : 'done';
    },
    [openDraft],
  );

  const takeTrait = useCallback(() => {
    const carried = carryRef.current;
    carryRef.current = null;
    const trait = carried ?? queueRef.current.take();
    refreshSlots();
    return trait;
  }, [refreshSlots]);

  const returnTrait = useCallback(
    (trait: BlockTrait) => {
      carryRef.current = trait;
      refreshSlots();
    },
    [refreshSlots],
  );

  const onLanding = useCallback(
    (quality: LandingQuality) => {
      if (quality !== 'perfect') return;
      queueRef.current.revealSealed();
      refreshSlots();
    },
    [refreshSlots],
  );

  const consumeFreeRecovery = useCallback(() => {
    if (recoveriesRef.current >= modsRef.current.freeRecoveries) return false;
    recoveriesRef.current += 1;
    return true;
  }, []);

  const reset = useCallback(
    (seed: number) => {
      seedRef.current = seed;
      queueRef.current = createTraitQueue(mixSeed(seed, 0), { goldWeightMul });
      carryRef.current = null;
      ownedRef.current = NO_PERKS;
      modsRef.current = combineMods(NO_PERKS);
      dueRef.current = [];
      lastFloorRef.current = 0;
      peakRef.current = 0;
      tierRef.current = 0;
      recoveriesRef.current = 0;
      rivalsRef.current = [];
      draftRef.current = null;
      setRivals([]);
      setOwned(NO_PERKS);
      setDraft(null);
      setRank(rankFor(0));
      setRankUp(null);
      setOvertakes([]);
      refreshSlots();
      repickRivals();
    },
    [refreshSlots, repickRivals, goldWeightMul],
  );

  const clearRankUp = useCallback(() => setRankUp(null), []);
  const shiftOvertake = useCallback(() => setOvertakes((q) => q.slice(1)), []);
  const mods = useMemo(() => combineMods(owned), [owned]);

  return {
    owned, mods, modsRef, slots,
    draftOffer: draft?.offer ?? null, draftFloor: draft?.floor ?? null,
    rank, rankUp, clearRankUp, rivals, overtake: overtakes[0] ?? null, shiftOvertake, setBoard,
    onPeak, baseline, hasDraftDue, openDraft, pickPerk, takeTrait, returnTrait, onLanding, consumeFreeRecovery, reset,
  };
}
