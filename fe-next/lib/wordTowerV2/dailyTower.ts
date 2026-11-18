/**
 * Word Tower v2 — the daily tower that PERSISTS across UTC days (pure).
 *
 * The daily run used to start from an empty lot every day. Now the tower you
 * left is the tower you come back to: each new UTC day only moves the BASELINE
 * (the height you start today at), and the day's score is how much you GREW it.
 *
 * Two safety nets keep a big tower from becoming a liability:
 *  - `dayStart` is a checkpoint of the tower as the day began. A total collapse
 *    rolls back to it (you lose today's growth, never the whole skyline) — the
 *    daily board already kept your best climb, so the score is not lost.
 *  - a partial fall (the run goes on with the floors still standing) can leave
 *    the tower SHORTER than it was this morning. The score then counts from that
 *    low point (`scoreFromM`), so every floor rebuilt counts toward today's goal
 *    instead of first having to climb back past the morning height.
 *  - floors are capped at MAX_SAVED_FLOORS so the physics restore stays cheap;
 *    the height of floors dropped off the bottom is carried (`carriedM`) so the
 *    growth arithmetic never notices.
 */
import { fnv1aHash, mulberry32 } from '@/lib/rng/seededRandom';
import { cleanUntrustedText } from './sanitizeText';

export const MAX_SAVED_FLOORS = 100;
const MAX_WORD = 15;
const MAX_HEIGHT_M = 1_000_000;

export interface TowerCheckpoint {
  words: string[];
  carriedM: number;
  totalM: number;
}

export interface DailyTowerSave {
  v: 1;
  language: string;
  /** UTC day the `dayStart` baseline belongs to ('' = never rolled). */
  dayKey: string;
  /** Standing floors, lowest first, as of the last commit. */
  words: string[];
  /** Height of floors dropped off the bottom past the cap. */
  carriedM: number;
  /** carriedM + the standing height at the last commit. */
  totalM: number;
  /** The tower as today began — the collapse fallback and the goal's size. */
  dayStart: TowerCheckpoint;
  /**
   * Height today's score counts from: `dayStart.totalM`, or lower once a fall
   * left the tower below it. Missing in saves written before it existed.
   */
  scoreFromM?: number;
}

export const towerSaveKey = (language: string) => `wt2-daily-tower-${language}`;

export function emptySave(language: string): DailyTowerSave {
  return {
    v: 1,
    language,
    dayKey: '',
    words: [],
    carriedM: 0,
    totalM: 0,
    dayStart: { words: [], carriedM: 0, totalM: 0 },
    scoreFromM: 0,
  };
}

/** A new UTC day only moves the baseline to where the tower stands now. */
export function rollDay(save: DailyTowerSave, today: string): DailyTowerSave {
  if (save.dayKey === today) return save;
  return {
    ...save,
    dayKey: today,
    dayStart: { words: save.words, carriedM: save.carriedM, totalM: save.totalM },
    scoreFromM: save.totalM,
  };
}

/** Where today's score counts from: never above the morning height. */
export function scoreBaseM(save: DailyTowerSave): number {
  const morning = save.dayStart.totalM;
  return typeof save.scoreFromM === 'number' ? Math.min(save.scoreFromM, morning) : morning;
}

/** Whole metres grown today — this IS the day's score. */
export function growthToday(save: DailyTowerSave): number {
  return Math.max(0, Math.floor(save.totalM - scoreBaseM(save)));
}

/**
 * Record the tower as it stands. `words` is every standing floor, lowest first;
 * `standingM` the height physics measures for exactly those floors.
 */
export function commitTower(
  save: DailyTowerSave,
  tower: { words: string[]; standingM: number },
): DailyTowerSave {
  const words = tower.words.filter((w) => w.length > 0);
  const standingM = Math.max(0, tower.standingM);
  const dropped = Math.max(0, words.length - MAX_SAVED_FLOORS);
  const droppedM = words.length > 0 ? (standingM * dropped) / words.length : 0;
  const kept = dropped > 0 ? words.slice(dropped) : words;
  // `save.carriedM` already covers floors dropped by EARLIER commits; the world
  // being committed only ever contains the kept ones, so it is added, not replaced.
  const carriedM = save.carriedM + droppedM;
  const totalM = carriedM + (standingM - droppedM);
  // A fall that left the tower below where today's score counts from: count from
  // here, so the floors rebuilt on top of what still stands are today's growth.
  const scoreFromM = Math.min(scoreBaseM(save), totalM);
  return { ...save, words: kept, carriedM, totalM, scoreFromM };
}

/** Total collapse: back to the checkpoint the day started from (today's growth is lost). */
export function revertToDayStart(save: DailyTowerSave): DailyTowerSave {
  const { words, carriedM, totalM } = save.dayStart;
  return { ...save, words, carriedM, totalM, scoreFromM: totalM };
}

/**
 * Today's goal, in whole metres of growth. Scales gently with the tower (a
 * skyscraper should not need a marathon) and wobbles per day so it is a target
 * rather than a constant. Floor of 6 m = two floors; ceiling keeps it a session.
 */
export function dailyTargetM(baselineTotalM: number, dayKey: string): number {
  const rng = mulberry32(fnv1aHash(`wt2-target-${dayKey}`) || 1);
  const jitter = 0.85 + rng() * 0.3;
  const raw = (9 + Math.sqrt(Math.max(0, baselineTotalM)) * 1.4) * jitter;
  const rounded = Math.round(raw / 3) * 3;
  return Math.min(60, Math.max(6, rounded));
}

// ── Storage (untrusted: localStorage is editable) ────────────────────────────

const num = (v: unknown, hi = MAX_HEIGHT_M): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(0, v)) : 0;

export function cleanWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const w of raw) {
    if (typeof w !== 'string') continue;
    // Words come off the dictionary: letters only, so markup can never ride a label.
    const clean = cleanUntrustedText(w.replace(/[^\p{L}\p{M}'-]/gu, ''), MAX_WORD);
    if (clean) out.push(clean);
    if (out.length >= MAX_SAVED_FLOORS) break;
  }
  return out;
}

function cleanCheckpoint(raw: unknown): TowerCheckpoint {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return { words: cleanWords(o.words), carriedM: num(o.carriedM), totalM: num(o.totalM) };
}

export function loadDailyTower(
  language: string,
  storage: { getItem(key: string): string | null } | null,
): DailyTowerSave {
  const empty = emptySave(language);
  if (!storage) return empty;
  try {
    const raw = storage.getItem(towerSaveKey(language));
    if (!raw) return empty;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || o.v !== 1 || !Array.isArray(o.words)) return empty;
    const dayStart = cleanCheckpoint(o.dayStart);
    return {
      v: 1,
      language,
      dayKey: typeof o.dayKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.dayKey) ? o.dayKey : '',
      words: cleanWords(o.words),
      carriedM: num(o.carriedM),
      totalM: num(o.totalM),
      dayStart,
      scoreFromM: typeof o.scoreFromM === 'number' ? Math.min(num(o.scoreFromM), dayStart.totalM) : dayStart.totalM,
    };
  } catch {
    return empty;
  }
}

/** A tower from an earlier visit exists: opening the daily only shows it until a floor lands. */
export function hasSavedDailyTower(
  language: string,
  storage: { getItem(key: string): string | null } | null,
): boolean {
  return loadDailyTower(language, storage).words.length > 0;
}

export function saveDailyTower(
  save: DailyTowerSave,
  storage: { setItem(key: string, value: string): void } | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(towerSaveKey(save.language), JSON.stringify(save));
  } catch {
    /* quota / private mode: the tower simply is not remembered */
  }
}
