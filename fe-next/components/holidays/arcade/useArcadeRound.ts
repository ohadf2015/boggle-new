'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import { holidayPost, holidayQuery } from '@/lib/holidays/holidayClient';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';

export interface RoundEnd {
  score: number;
  won?: boolean;
  players?: number;
  champion?: string;
  championScore?: number;
}

export type Settle =
  | { state: 'guest' }
  | { state: 'saving' }
  | { state: 'error' }
  | { state: 'done'; score: number; coins: number; capped?: boolean; coinError?: boolean };

type Phase =
  | { phase: 'playing'; seed: number; key: number }
  | { phase: 'over'; seed: number; key: number; end: RoundEnd; settle: Settle };

export const arcadeMode = (game: ArcadeGameId) => `holiday-arcade-${game}`;

const newSeed = () => 1 + Math.floor(Math.random() * (2 ** 31 - 2));

export function useArcadeRound(game: ArcadeGameId) {
  const roundKey = useRef(1);
  const [state, setRaw] = useState<Phase>(() => ({ phase: 'playing', seed: newSeed(), key: roundKey.current }));
  const live = useRef(state);
  const setState = useCallback((next: Phase) => {
    live.current = next;
    setRaw(next);
  }, []);
  const sfx = useSoundEffects();
  const startedAt = useRef(0);
  const trackId = useRef('');
  const roundId = useRef<Promise<string | null>>(Promise.resolve(null));
  const setSfxActive = sfx.setGameActive;
  const setInGame = useHideNavigation();
  const setGameActive = useCallback(
    (on: boolean) => {
      setSfxActive(on);
      setInGame(on);
    },
    [setSfxActive, setInGame],
  );

  const register = useCallback(() => {
    const q = holidayQuery();
    trackId.current = `${game}-${Date.now()}-${roundKey.current}`;
    startedAt.current = Date.now();
    trackGameStart(arcadeMode(game), { roundId: trackId.current, holiday: q?.holiday });
    setGameActive(true);
    roundId.current = q
      ? holidayPost<{ roundId: string | null }>('arcade/round', q, { game }).then((r) => r.roundId)
      : Promise.reject(new Error('no holiday'));
    roundId.current.catch(() => undefined);
  }, [game, setGameActive]);

  const start = useCallback(() => {
    roundKey.current += 1;
    setState({ phase: 'playing', seed: newSeed(), key: roundKey.current });
    register();
  }, [register, setState]);

  const settle = useCallback(async (end: RoundEnd, pending: Promise<string | null>): Promise<Settle> => {
    if (!hasSupabaseSession()) return { state: 'guest' };
    let id: string | null;
    try {
      id = await pending;
    } catch {
      return { state: 'error' };
    }
    const q = holidayQuery();
    if (!id || !q) return { state: 'guest' };
    try {
      const res = await holidayPost<{ score: number; coins: number; capped?: boolean; coinError?: boolean }>('arcade/score', q, { roundId: id, score: end.score });
      return { state: 'done', ...res };
    } catch {
      return { state: 'error' };
    }
  }, []);

  const finish = useCallback(
    (end: RoundEnd) => {
      const s = live.current;
      if (s.phase !== 'playing') return;
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      trackGameEnd(arcadeMode(game), end.score, end.players ?? 1, true, duration, { roundId: trackId.current, won: end.won === true });
      setGameActive(false);
      setState({ phase: 'over', seed: s.seed, key: s.key, end, settle: hasSupabaseSession() ? { state: 'saving' } : { state: 'guest' } });
      void settle(end, roundId.current).then((result) => {
        const cur = live.current;
        if (cur.phase === 'over' && cur.key === s.key) setState({ ...cur, settle: result });
      });
    },
    [game, setGameActive, settle, setState],
  );

  useEffect(() => {
    register();
    return () => setGameActive(false);
  }, [register, setGameActive]);

  return { state, start, finish };
}
