'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AchievementPercents = Record<string, number>;

const ROW_CAP = 200;
let cache: AchievementPercents | null = null;
let inflight: Promise<AchievementPercents> | null = null;

async function fetchPercents(): Promise<AchievementPercents> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('achievement_global_stats')
    .select('achievement_key, holders, total_players')
    .limit(ROW_CAP);
  if (error || !data) return {};
  const out: AchievementPercents = {};
  for (const row of data as Array<{ achievement_key: string; holders: number; total_players: number }>) {
    if (row.total_players > 0) out[row.achievement_key] = (row.holders / row.total_players) * 100;
  }
  return out;
}

/** "X% of players have this", from the daily snapshot table (never computed live). */
export function useAchievementGlobalStats(): AchievementPercents {
  const [percents, setPercents] = useState<AchievementPercents>(cache ?? {});
  useEffect(() => {
    if (cache) return;
    let alive = true;
    inflight ??= fetchPercents().then(p => {
      if (Object.keys(p).length > 0) cache = p;
      else inflight = null;
      return p;
    });
    void inflight.then(p => {
      if (alive) setPercents(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return percents;
}

export function formatHolderPercent(pct: number): string {
  return pct < 1 ? '<1' : String(Math.round(pct));
}

export function __resetAchievementStatsForTests() {
  cache = null;
  inflight = null;
}
