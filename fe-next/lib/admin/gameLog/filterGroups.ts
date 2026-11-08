/**
 * Admin game-log filters over GROUPED games: what kind of play to show
 * (people / real / empty / bots / all) and which mode bucket.
 *
 * Each filter's counts are computed with the OTHER filter applied, so the
 * chips and the mode picker always show how many rows a tap would leave.
 */
import type { GameGroup } from './groupGames';
import { EMPTY_ENGAGEMENTS } from './engagement';
import { CANONICAL_MODE_BUCKETS } from './modeBuckets';

export const SHOW_FILTERS = ['people', 'real', 'empty', 'bots', 'all'] as const;
export type ShowFilter = (typeof SHOW_FILTERS)[number];
export type ShowCounts = Record<ShowFilter, number>;

const MODE_KEYS = new Set<string>(['all', 'other', ...CANONICAL_MODE_BUCKETS.map((b) => b.key)]);

export function parseShowFilter(raw: string | null): ShowFilter {
  return (SHOW_FILTERS as readonly string[]).includes(raw ?? '') ? (raw as ShowFilter) : 'people';
}

export function parseModeFilter(raw: string | null): string {
  return raw && MODE_KEYS.has(raw) ? raw : 'all';
}

function matchesShow(g: GameGroup, show: ShowFilter): boolean {
  switch (show) {
    case 'all': return true;
    case 'bots': return g.engagement === 'bot';
    case 'real': return g.engagement === 'played';
    case 'empty': return EMPTY_ENGAGEMENTS.has(g.engagement);
    case 'people':
    default: return g.engagement !== 'bot';
  }
}

function matchesMode(g: GameGroup, mode: string): boolean {
  if (mode === 'all') return true;
  if (mode === 'multiplayer') return g.isMultiplayer;
  return !g.isMultiplayer && g.typeBucket === mode;
}

export interface FilterResult {
  groups: GameGroup[];
  showCounts: ShowCounts;
  /** Per mode-bucket key (plus 'all' and 'multiplayer'), under the current show filter. */
  modeCounts: Record<string, number>;
}

export function filterGameGroups(
  groups: GameGroup[],
  opts: { show: ShowFilter; mode: string },
): FilterResult {
  const inMode = groups.filter((g) => matchesMode(g, opts.mode));
  const showCounts = Object.fromEntries(
    SHOW_FILTERS.map((s) => [s, inMode.filter((g) => matchesShow(g, s)).length]),
  ) as ShowCounts;

  const inShow = groups.filter((g) => matchesShow(g, opts.show));
  const modeCounts: Record<string, number> = { all: inShow.length, multiplayer: 0 };
  for (const g of inShow) {
    if (g.isMultiplayer) {
      modeCounts.multiplayer += 1;
      continue;
    }
    modeCounts[g.typeBucket] = (modeCounts[g.typeBucket] ?? 0) + 1;
  }

  return {
    groups: inShow.filter((g) => matchesMode(g, opts.mode)),
    showCounts,
    modeCounts,
  };
}
