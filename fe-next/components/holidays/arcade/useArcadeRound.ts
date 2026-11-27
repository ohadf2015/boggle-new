'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import type { ArcadeContentMap } from '@/lib/holidays/arcade/content';
import type { ArcadeGameId, ArcadePlay } from '@/lib/holidays/arcade/games';
import { holidayPost, holidayQuery } from '@/lib/holidays/holidayClient';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { trackGameEnd, trackGameStart } from '@/utils/growthTracking';

export interface RoundStart<G extends ArcadeGameId> {
  roundId: string | null;
  lang: string;
  seconds: number;
  content: ArcadeContentMap[G];
}

export interface RoundEnd {
  score: number;
  plays: ArcadePlay[];
  won?: boolean;
  players?: number;
}

export type Settle =
  | { state: 'guest' }
  | { state: 'saving' }
  | { state: 'error' }
  | { state: 'done'; score: number; coins: number; capped?: boolean; coinError?: boolean };

type Phase<G extends ArcadeGameId> =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'playing'; round: RoundStart<G>; key: number }
  | { phase: 'over'; round: RoundStart<G>; key: number; end: RoundEnd; settle: Settle };

export const arcadeMode = (game: ArcadeGameId) => `holiday-arcade-${game}`;

export function useArcadeRound<G extends ArcadeGameId>(game: G) {
  const [state, setRaw] = useState<Phase<G>>({ phase: 'loading' });
  const live = useRef(state);
  const setState = useCallback((next: Phase<G>) => {
    live.current = next;
    setRaw(next);
  }, []);
  const sfx = useSoundEffects();
  const startedAt = useRef(0);
  const trackId = useRef('');
  const roundKey = useRef(0);
  const setSfxActive = sfx.setGameActive;
  const setInGame = useHideNavigation();
  const setGameActive = useCallback(
    (on: boolean) => {
      setSfxActive(on);
      setInGame(on);
    },
    [setSfxActive, setInGame],
  );

  const start = useCallback(async () => {
    setState({ phase: 'loading' });
    const q = holidayQuery();
    if (!q) return setState({ phase: 'error' });
    try {
      const round = await holidayPost<RoundStart<G>>('arcade/round', q, { game });
      roundKey.current += 1;
      trackId.current = round.roundId ?? `${game}-${Date.now()}-${roundKey.current}`;
      startedAt.current = Date.now();
      trackGameStart(arcadeMode(game), { roundId: trackId.current, holiday: q.holiday });
      setGameActive(true);
      setState({ phase: 'playing', round, key: roundKey.current });
    } catch {
      setState({ phase: 'error' });
    }
  }, [game, setGameActive, setState]);

  const settle = useCallback(async (round: RoundStart<G>, end: RoundEnd): Promise<Settle> => {
    const q = holidayQuery();
    if (!round.roundId || !q || !hasSupabaseSession()) return { state: 'guest' };
    try {
      const res = await holidayPost<{ score: number; coins: number; capped?: boolean; coinError?: boolean }>('arcade/score', q, {
        roundId: round.roundId, plays: end.plays, score: end.score,
      });
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
      trackGameEnd(arcadeMode(game), end.score, end.players ?? end.plays.length, true, duration, { roundId: trackId.current, won: end.won === true });
      setGameActive(false);
      const round = s.round;
      setState({ phase: 'over', round, key: s.key, end, settle: round.roundId ? { state: 'saving' } : { state: 'guest' } });
      void settle(round, end).then((result) => {
        const cur = live.current;
        if (cur.phase === 'over' && cur.round === round) setState({ ...cur, settle: result });
      });
    },
    [game, setGameActive, settle, setState],
  );

  useEffect(() => {
    void start();
    return () => setGameActive(false);
  }, [start, setGameActive]);

  return { state, start, finish };
}
