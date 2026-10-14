/**
 * Word Bridge daily — the finished run, kept on this device for the rest of
 * the UTC day.
 *
 * Without it, re-opening /connections/daily after finishing (hub card, a
 * NextQuestCta, a reload) silently started the same riddles over — with the
 * answer key already seen, and the server keeping the best score, so a replay
 * was also a free leaderboard climb. On a pyramid day it was worse: a won
 * pyramid is marked solved, so a reload served a DIFFERENT pyramid.
 *
 * One key, one run. Stale days and malformed data read as "nothing played".
 */
import type { BridgeOutcome } from './shareGrid';

const KEY = 'connections-daily-snapshot';

interface Base {
  dateISO: string;
  /** Locale the run was played in — its puzzles are rebuilt from it. */
  language: string;
  score: number;
  outcomes: BridgeOutcome[];
  streak: number;
}

export interface DailyBridgeSnapshot extends Base {
  kind: 'bridge';
  solvedCount: number;
  total: number;
  rank: number | null;
}

export interface DailyPyramidSnapshot extends Base {
  kind: 'pyramid';
  pyramidId: string;
  won: boolean;
  gaveUpBase: boolean[];
}

export type DailySnapshot = DailyBridgeSnapshot | DailyPyramidSnapshot;

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isOutcome(o: unknown): o is BridgeOutcome {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.reached === 'boolean' &&
    typeof r.solved === 'boolean' &&
    typeof r.wrongAttempts === 'number' &&
    typeof r.hintUsed === 'boolean'
  );
}

function isSnapshot(v: unknown): v is DailySnapshot {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  const base =
    typeof s.dateISO === 'string' &&
    typeof s.language === 'string' &&
    typeof s.score === 'number' &&
    typeof s.streak === 'number' &&
    Array.isArray(s.outcomes) &&
    s.outcomes.every(isOutcome);
  if (!base) return false;
  if (s.kind === 'bridge') {
    return (
      typeof s.solvedCount === 'number' &&
      typeof s.total === 'number' &&
      (s.rank === null || typeof s.rank === 'number')
    );
  }
  if (s.kind === 'pyramid') {
    return (
      typeof s.pyramidId === 'string' &&
      typeof s.won === 'boolean' &&
      Array.isArray(s.gaveUpBase) &&
      s.gaveUpBase.every((g) => typeof g === 'boolean')
    );
  }
  return false;
}

export function saveDailySnapshot(snapshot: DailySnapshot): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* quota / private mode — the run still finished, it just won't persist */
  }
}

/** Today's finished run, or null (nothing played, a previous day, or corrupt). */
export function loadDailySnapshot(dateISO: string): DailySnapshot | null {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed) || parsed.dateISO !== dateISO) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Merge numbers that arrive after the run ended (server streak / rank). */
export function updateDailySnapshot(
  dateISO: string,
  patch: Partial<Pick<DailyBridgeSnapshot, 'streak' | 'rank'>>,
): void {
  const current = loadDailySnapshot(dateISO);
  if (!current) return;
  saveDailySnapshot({ ...current, ...patch } as DailySnapshot);
}
