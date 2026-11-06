import type { TowerBlock } from '@/lib/wordTowerV2/estateTower';
import { MAX_WRECK_BLOCKS, towerFromWords } from '@/lib/wordTowerV2/wreck';

/** One row of today's daily board (metres grown today). */
export interface DailyRivalRow {
  rank: number;
  username: string;
  bestHeightM: number;
  floors: number;
  /** Top floors of their tower; [] on rows saved before towers were stored. */
  words: string[];
  isYou?: boolean;
}

export interface WreckSuggestion {
  target: DailyRivalRow;
  /** ahead = just above me; chasing = I lead and they are next; leader = I have no row yet. */
  kind: 'ahead' | 'chasing' | 'leader';
  gapM: number;
}

/** Who the results screen dares you to knock down: always someone near you on today's board. */
export function wreckSuggestion(rows: readonly DailyRivalRow[]): WreckSuggestion | null {
  const sorted = [...rows].sort((a, b) => a.rank - b.rank);
  const meAt = sorted.findIndex((r) => r.isYou);
  const gap = (a: DailyRivalRow, b: DailyRivalRow) => Math.max(0, Math.round(a.bestHeightM - b.bestHeightM));
  if (meAt < 0) return sorted[0] ? { target: sorted[0], kind: 'leader', gapM: 0 } : null;
  const me = sorted[meAt];
  if (meAt > 0) return { target: sorted[meAt - 1], kind: 'ahead', gapM: gap(sorted[meAt - 1], me) };
  const next = sorted[1];
  return next ? { target: next, kind: 'chasing', gapM: gap(me, next) } : null;
}

const MIN_STAND_IN = 3;

/** Their real top floors, or a mystery building of their floor count for rows that predate stored towers. */
export function dailyRivalTower(row: DailyRivalRow): TowerBlock[] {
  if (row.words.length > 0) return towerFromWords(row.words);
  const floors = Math.min(MAX_WRECK_BLOCKS, Math.max(MIN_STAND_IN, Math.round(row.floors) || 0));
  return towerFromWords(Array.from({ length: floors }, (_, i) => '?'.repeat(3 + (i % 3))));
}
