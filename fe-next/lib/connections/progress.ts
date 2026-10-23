/**
 * Lifetime "Bridge Builder" progress: every bridge solved (daily, endless or
 * pyramid) counts toward a rank ladder, and each day played lights a pip in the
 * weekly strip. Device-local on purpose — it must work for guests, and the
 * server-side streak/leaderboard stay the competitive source of truth.
 */

export const PROGRESS_KEY = 'connections:progress:v1';
const DAYS_CAP = 45;

export const RANKS = [
  { id: 'plank', min: 0 },
  { id: 'rope', min: 10 },
  { id: 'builder', min: 30 },
  { id: 'span', min: 75 },
  { id: 'arch', min: 150 },
  { id: 'legend', min: 300 },
] as const;

export type RankId = (typeof RANKS)[number]['id'];
export type Rank = (typeof RANKS)[number];

export interface BridgeProgress {
  bridges: number;
  days: string[];
}

export interface RankStanding {
  rank: Rank;
  next: Rank | null;
  /** Bridges built since this rank began. */
  intoRank: number;
  /** Bridges the whole rank spans (0 at the top). */
  span: number;
  /** 0–1 fill toward the next rank; 1 at the top. */
  ratio: number;
}

export function rankFor(bridges: number): RankStanding {
  const n = Number.isFinite(bridges) && bridges > 0 ? Math.floor(bridges) : 0;
  let index = 0;
  RANKS.forEach((r, i) => {
    if (n >= r.min) index = i;
  });
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  if (!next) return { rank, next: null, intoRank: n - rank.min, span: 0, ratio: 1 };
  const span = next.min - rank.min;
  const intoRank = n - rank.min;
  return { rank, next, intoRank, span, ratio: intoRank / span };
}

const EMPTY: BridgeProgress = { bridges: 0, days: [] };

export function loadProgress(): BridgeProgress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...EMPTY, days: [] };
    const parsed = JSON.parse(raw) as Partial<BridgeProgress>;
    const bridges =
      typeof parsed.bridges === 'number' && Number.isFinite(parsed.bridges) && parsed.bridges > 0
        ? Math.floor(parsed.bridges)
        : 0;
    const days = Array.isArray(parsed.days) ? parsed.days.filter((d): d is string => typeof d === 'string') : [];
    return { bridges, days };
  } catch {
    return { ...EMPTY, days: [] };
  }
}

function save(p: BridgeProgress): void {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* storage blocked — progress simply isn't kept */
  }
}

/** Count one solved bridge. `rankedUp` is true only for the bridge that crosses a threshold. */
export function recordBridge(): { progress: BridgeProgress; rankedUp: boolean; standing: RankStanding } {
  const before = loadProgress();
  const progress = { ...before, bridges: before.bridges + 1 };
  save(progress);
  const standing = rankFor(progress.bridges);
  return { progress, rankedUp: standing.rank.id !== rankFor(before.bridges).rank.id, standing };
}

export function recordPlayDay(dateISO: string): BridgeProgress {
  const p = loadProgress();
  if (p.days.includes(dateISO)) return p;
  const next = { ...p, days: [...p.days, dateISO].slice(-DAYS_CAP) };
  save(next);
  return next;
}

export interface WeekPip {
  date: string;
  played: boolean;
  isToday: boolean;
}

const MS_PER_DAY = 86_400_000;

/** The 7 UTC days ending at `todayISO`, oldest first. */
export function weekStrip(days: readonly string[], todayISO: string): WeekPip[] {
  const end = Date.parse(`${todayISO}T00:00:00Z`);
  const played = new Set(days);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(end - (6 - i) * MS_PER_DAY).toISOString().slice(0, 10);
    return { date, played: played.has(date), isToday: i === 6 };
  });
}
