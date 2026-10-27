'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { impactThunk } from '@/lib/wordTowerV2/juice';
import { type TowerGear, gearFromEstate } from '@/lib/wordTowerV2/gear';
import type { GhostPreview } from './TowerCanvas';
import type { UseEstate } from './useEstate';
import type { useTowerRun } from './useTowerRun';

type PlaySound = ReturnType<typeof useSoundEffects>['playSound'];

interface Args {
  game: ReturnType<typeof useTowerRun>;
  estateApi: UseEstate;
  word: string;
  valid: boolean;
  playSound: PlaySound;
}

/**
 * Everything TowerCanvas reads per frame, as stable getters over refs that are
 * refreshed on every render — the Pixi loop must never wait on React.
 */
export function useCanvasFeeds({ game, estateApi, word, valid, playSound }: Args) {
  const { phase, heightM, previewWidth } = game;
  // The slab on the hook, read by the canvas every frame.
  const ghostRef = useRef<GhostPreview | null>(null);
  ghostRef.current =
    phase === 'composing' && word.length > 0 ? { word, widthPx: previewWidth(word), valid } : null;
  const getGhost = useCallback(() => ghostRef.current, []);
  const getHangingId = useCallback(() => game.hangingRef.current?.id ?? null, [game.hangingRef]);
  const bestRef = useRef(game.bestM);
  bestRef.current = game.bestM;
  const getBestM = useCallback(() => bestRef.current, []);
  const sceneMRef = useRef(heightM);
  sceneMRef.current = heightM;
  const getSceneM = useCallback(() => sceneMRef.current, []);
  const getPerfectWindowMult = useCallback(() => game.perksRef.current.perfectWindowMult, [game.perksRef]);
  // The workshop's upgrades, painted on the tower. A ref so the canvas loop reads the latest.
  const gearRef = useRef<TowerGear | null>(null);
  gearRef.current = estateApi.status === 'loading' ? null : gearFromEstate(estateApi.estate);
  const getGear = useCallback(() => gearRef.current, []);

  // Free look sends the camera home on every hoist, so the swing a player has to
  // time is always framed — see TowerCanvas `homeKey`.
  const [homeKey, setHomeKey] = useState(0);
  useEffect(() => {
    if (phase === 'swinging') setHomeKey((k) => k + 1);
  }, [phase]);

  // Brick-on-brick: a thunk on contact, heavier for a harder landing.
  const onImpact = useCallback(
    (speed: number) => {
      const thunk = impactThunk(speed);
      if (thunk) playSound('bossHit', thunk);
    },
    [playSound],
  );

  return { getGhost, getHangingId, getBestM, getSceneM, getPerfectWindowMult, getGear, homeKey, onImpact };
}
