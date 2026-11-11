import type { ResultsMode } from '@/lib/rivals/types';

export type RecordUnit = 'points' | 'metres';

export interface RecordDef {
  key: string;
  mode: ResultsMode;
  /** The sub-mode a results screen passes (QP mode, MP game mode, daily hero mode). */
  subMode?: string;
  labelKey: string;
  unit: RecordUnit;
}

const def = (key: string, mode: ResultsMode, subMode?: string, unit: RecordUnit = 'points'): RecordDef => ({
  key,
  mode,
  subMode,
  labelKey: `worldRecords.modes.${key}`,
  unit,
});

/** Same order the hall of fame shows. Must match the keys game_record_candidates() emits. */
export const RECORD_KEYS: readonly RecordDef[] = [
  def('mp_classic', 'multiplayer', 'classic'),
  def('mp_word_hunt', 'multiplayer', 'word-hunt'),
  def('mp_wheel_rush', 'multiplayer', 'wheel-rush'),
  def('mp_blast', 'multiplayer', 'blast'),
  def('qp_classic', 'quickPlay', 'classic'),
  def('qp_word_hunt', 'quickPlay', 'word-hunt'),
  def('qp_wheel_rush', 'quickPlay', 'wheel-rush'),
  def('qp_blast', 'quickPlay', 'blast'),
  def('daily_word_hunt', 'daily', 'word-hunt'),
  def('daily_word_wheel', 'daily', 'word-wheel'),
  def('daily_connections', 'daily', 'connections'),
  def('blast', 'blast'),
  def('tower', 'tower', undefined, 'metres'),
  def('single', 'single'),
];

const BY_KEY = new Map(RECORD_KEYS.map((d) => [d.key, d]));

/** Modes where a missing sub-mode means the classic game. */
const CLASSIC_DEFAULT: ReadonlySet<ResultsMode> = new Set(['quickPlay', 'multiplayer']);

export function getRecordDef(key: string): RecordDef | undefined {
  return BY_KEY.get(key);
}

export function isRecordKey(key: unknown): key is string {
  return typeof key === 'string' && BY_KEY.has(key);
}

/** The world record a results screen competes for, or null when that game keeps none (classrooms, unknown dailies). */
export function recordKeyFor(mode: ResultsMode, subMode?: string | null): string | null {
  const candidates = RECORD_KEYS.filter((d) => d.mode === mode);
  if (candidates.length === 0) return null;
  if (candidates.length === 1 && candidates[0].subMode === undefined) return candidates[0].key;
  const wanted = subMode ?? (CLASSIC_DEFAULT.has(mode) ? 'classic' : null);
  return candidates.find((d) => d.subMode === wanted)?.key ?? null;
}
