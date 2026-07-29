import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getMpTheme } from '@/lib/multiplayer/desktopThemes';
import type { MpDesktopMode } from '../types';
import type { RosterPlayer } from '../RosterRail';

const TICK_LIFE_MS = 600;
const DEBOUNCE_MS = 250;

interface ScoreTick {
  id: string;
  delta: number;
  ts: number;
}

export interface UseScoreTickQueueResult {
  ticksByUserId: Map<string, ScoreTick[]>;
}

export function useScoreTickQueue(leaderboard: RosterPlayer[]): UseScoreTickQueueResult {
  const prevScores = useRef<Map<string, number>>(new Map());
  const lastFire = useRef<Map<string, number>>(new Map());
  const [ticks, setTicks] = useState<Map<string, ScoreTick[]>>(new Map());

  useEffect(() => {
    const next = new Map(ticks);
    let changed = false;
    const now = Date.now();
    for (const p of leaderboard) {
      const prev = prevScores.current.get(p.userId);
      if (prev != null && p.score > prev) {
        const last = lastFire.current.get(p.userId) ?? 0;
        if (now - last >= DEBOUNCE_MS) {
          const tick: ScoreTick = { id: `${p.userId}-${now}`, delta: p.score - prev, ts: now };
          const arr = next.get(p.userId) ?? [];
          next.set(p.userId, [...arr, tick]);
          lastFire.current.set(p.userId, now);
          changed = true;
        }
      }
      prevScores.current.set(p.userId, p.score);
    }
    if (changed) setTicks(next);

    const expireTimer = window.setTimeout(() => {
      const cutoff = Date.now() - TICK_LIFE_MS;
      const cleaned = new Map<string, ScoreTick[]>();
      let dirty = false;
      for (const [uid, arr] of next.entries()) {
        const kept = arr.filter(t => t.ts > cutoff);
        if (kept.length !== arr.length) dirty = true;
        if (kept.length > 0) cleaned.set(uid, kept);
      }
      if (dirty) setTicks(cleaned);
    }, TICK_LIFE_MS + 50);

    return () => window.clearTimeout(expireTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboard]);

  return { ticksByUserId: ticks };
}

interface ScoreTickChipProps {
  delta: number;
  mode: MpDesktopMode;
  testId?: string;
}

export function ScoreTickChip({ delta, mode, testId }: ScoreTickChipProps) {
  const theme = getMpTheme(mode);
  const sign = delta > 0 ? '+' : '';
  return (
    <span
      data-testid={testId ?? 'score-tick-chip'}
      data-delta={delta}
      className={cn(
        'pointer-events-none absolute -top-1 end-1 px-1.5 py-0.5 text-[10px] font-bold tabular-nums rounded',
        'border-2 bg-card animate-score-tick-float',
        theme.borderClass,
        theme.textClass,
      )}
      style={{ animationDuration: `${TICK_LIFE_MS}ms` }}
    >
      {sign}
      {delta}
    </span>
  );
}
