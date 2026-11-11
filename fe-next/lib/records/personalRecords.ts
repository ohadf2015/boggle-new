import { readLocalBest as readBlastBest } from '@/components/blast/progress/localBest';
import { getAllTimeBest } from '@/components/singleplayer/highScoreManager';
import { getGuestProgress } from '@/lib/quickPlay/guestProgress';
import { readBest as readWordCraftBest } from '@/lib/word-craft/bestScore';
import { getDailyStreak } from '@/utils/dailyChallenge/streaks';
import type { ResultsMode } from '@/lib/rivals/types';
import { readRecordLedger } from './runRecord';

export type PersonalRecordKey =
  | 'longestWord'
  | 'singleBest'
  | 'quickPlayBest'
  | 'blastBest'
  | 'towerBestM'
  | 'wordCraftBest'
  | 'dailyStreakBest'
  | 'mpBestStreak'
  | 'multiplayerBest';

export interface PersonalRecord {
  key: PersonalRecordKey;
  value: number | string;
  previous?: number;
}

/** Profile columns that hold records (any may be missing for guests). */
export interface RecordProfileFields {
  longest_word?: string | null;
  mp_best_streak_classic?: number | null;
  mp_best_streak_wordhunt?: number | null;
}

// Written by components/wordTowerV2/runHelpers.writeBest; read directly so the profile page doesn't pull the physics engine.
const TOWER_BEST_KEY = 'wordTowerV2.bestM';
const BLAST_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const LEDGER_MODE: Partial<Record<PersonalRecordKey, ResultsMode>> = {
  singleBest: 'single',
  quickPlayBest: 'quickPlay',
  blastBest: 'blast',
  towerBestM: 'tower',
  multiplayerBest: 'multiplayer',
};

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

function positive(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function collectPersonalRecords(profile: RecordProfileFields | null | undefined): PersonalRecord[] {
  const ledger = safe(readRecordLedger, {});
  const out: PersonalRecord[] = [];
  const push = (key: PersonalRecordKey, value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return;
    const mode = LEDGER_MODE[key];
    const entry = mode ? ledger[mode] : undefined;
    const previous = entry && typeof value === 'number' && entry.best === value ? entry.previous : undefined;
    out.push(previous !== undefined ? { key, value, previous } : { key, value });
  };

  push('longestWord', profile?.longest_word || null);
  push('singleBest', positive(safe(() => getAllTimeBest()?.score, null)));
  const qp = safe(() => getGuestProgress().bestScoreByMode ?? {}, {} as Record<string, number>);
  push('quickPlayBest', positive(Math.max(0, ...Object.values(qp))));
  push('blastBest', positive(Math.max(0, ...BLAST_DIFFICULTIES.map(d => safe(() => readBlastBest(d), null) ?? 0))));
  push('towerBestM', positive(safe(() => localStorage.getItem(TOWER_BEST_KEY), null)));
  push(
    'wordCraftBest',
    positive(Math.max(safe(() => readWordCraftBest('classic'), 0), safe(() => readWordCraftBest('territory'), 0))),
  );
  push('dailyStreakBest', positive(safe(() => getDailyStreak().longestStreak, 0)));
  push(
    'mpBestStreak',
    positive(Math.max(profile?.mp_best_streak_classic ?? 0, profile?.mp_best_streak_wordhunt ?? 0)),
  );
  push('multiplayerBest', positive(ledger.multiplayer?.best));
  return out;
}
