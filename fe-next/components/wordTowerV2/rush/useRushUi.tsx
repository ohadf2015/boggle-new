'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BlockTrait, PerkId } from '@/lib/wordTowerV2/rush/types';
import type { Phase } from '../useTowerRun';
import { NextUpQueue } from './NextUpQueue';
import { OvertakeToast } from './OvertakeToast';
import { PerkDraft } from './PerkDraft';
import { RankMeter } from './RankMeter';
import { RankUpBurst } from './RankUpBurst';
import { RushGhosts } from './RushGhosts';
import type { RushApi } from './useRush';
import { useRushBoard } from './useRushBoard';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Args {
  t: T;
  rush: RushApi;
  game: { phase: Phase; pickPerk: (id: PerkId) => void; getTrait: (id: string) => BlockTrait | undefined };
  daily: boolean;
  language: string;
  dailyBoard: Parameters<typeof useRushBoard>[0]['dailyBoard'];
  dailyBaseM: number;
  reducedMotion: boolean;
  canvasClass: string;
  getHudPx: () => number;
  inRun: boolean;
}

export function useRushUi({ t, rush, game, daily, language, dailyBoard, dailyBaseM, reducedMotion, canvasClass, getHudPx, inRun }: Args) {
  useRushBoard({ setBoard: rush.setBoard, daily, language, dailyBoard, dailyBaseM });
  const projectorRef = useRef<((hM: number) => number) | null>(null);
  const registerProjector = useCallback((fn: (hM: number) => number) => {
    projectorRef.current = fn;
  }, []);
  const canvasProps = useMemo(() => ({ registerProjector, getTrait: game.getTrait }), [registerProjector, game.getTrait]);

  const hudSlot = (
    <div className="flex h-full items-center justify-center gap-2">
      <RankMeter t={t} rank={rush.rank} reducedMotion={reducedMotion} />
      <NextUpQueue t={t} slots={rush.slots} reducedMotion={reducedMotion} />
    </div>
  );

  const toastsOn = inRun && game.phase !== 'draft';
  // In an effect: React Compiler memoizes render-time ref reads, which froze this at 0.
  const [hudPx, setHudPx] = useState(0);
  const toastKey = `${rush.rankUp?.key ?? ''}-${rush.overtake?.key ?? ''}`;
  useLayoutEffect(() => setHudPx(Math.round(getHudPx())), [toastKey, getHudPx]);
  const toastTop = `calc(${hudPx}px - max(0.5rem, env(safe-area-inset-top)) + 0.5rem)`;
  const overlays = (
    <>
      {inRun && rush.rivals.length > 0 ? <RushGhosts t={t} rivals={rush.rivals} projectorRef={projectorRef} canvasClass={canvasClass} /> : null}
      {inRun && game.phase === 'draft' && rush.draftOffer ? (
        <PerkDraft t={t} perks={rush.draftOffer} floor={rush.draftFloor ?? 0} onPick={game.pickPerk} reducedMotion={reducedMotion} />
      ) : null}
      {toastsOn && !rush.rankUp && rush.overtake ? (
        <OvertakeToast key={rush.overtake.key} t={t} name={rush.overtake.name} onDone={rush.shiftOvertake} reducedMotion={reducedMotion} topOffset={toastTop} />
      ) : null}
      {toastsOn && rush.rankUp ? (
        <RankUpBurst key={rush.rankUp.key} t={t} tierId={rush.rankUp.tierId} onDone={rush.clearRankUp} reducedMotion={reducedMotion} topOffset={toastTop} />
      ) : null}
    </>
  );

  return { canvasProps, hudSlot, overlays };
}
