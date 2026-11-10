/** Education activity today against yesterday, from classroom_rounds (test accounts already dropped). */

import { dayPace } from './seriesStats';

const DAY_MS = 86_400_000;
const SPARK_DAYS = 7;

export interface TodayTile {
  current: number;
  prior: number;
  projected: number | null;
  pct: number | null;
  /** One value per day, oldest first; present on the games tile only. */
  spark?: number[];
}

export type EduToday = { available: false } | { available: true; rounds: TodayTile; teachers: TodayTile; seats: TodayTile };

interface Round {
  teacher_id: string;
  player_count: number;
  completed_at: string;
}

export function buildEduToday(rounds: Round[] | null, nowMs: number): EduToday {
  if (rounds === null) return { available: false };
  const dayStart = nowMs - (nowMs % DAY_MS);
  const dayIndex = (iso: string) => Math.floor((Date.parse(iso) - (dayStart - (SPARK_DAYS - 1) * DAY_MS)) / DAY_MS);
  const perDay = Array.from({ length: SPARK_DAYS }, () => ({ rounds: 0, seats: 0, teachers: new Set<string>() }));
  for (const r of rounds) {
    const i = dayIndex(r.completed_at);
    if (i < 0 || i >= SPARK_DAYS) continue;
    perDay[i].rounds += 1;
    perDay[i].seats += r.player_count;
    perDay[i].teachers.add(r.teacher_id);
  }
  const tile = (pick: (d: (typeof perDay)[number]) => number, withSpark = false): TodayTile => {
    const current = pick(perDay[SPARK_DAYS - 1]);
    const prior = pick(perDay[SPARK_DAYS - 2]);
    return { current, prior, ...dayPace(current, prior, nowMs), ...(withSpark ? { spark: perDay.map(pick) } : {}) };
  };
  return { available: true, rounds: tile((d) => d.rounds, true), teachers: tile((d) => d.teachers.size), seats: tile((d) => d.seats) };
}
