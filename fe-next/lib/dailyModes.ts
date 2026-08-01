/**
 * Daily-challenge mode registry (pure).
 *
 * Single source of truth for which game modes are eligible for the daily flow
 * and which are still gated to admins while they're being readied for everyone.
 *
 * Today the live daily hub (`DailyChallengeLanding`) still renders the two
 * shipped modes (Word Hunt, Word Wheel) with their bespoke hero/quest cards.
 * This registry is the FOUNDATION for folding more modes in: a new mode is added
 * here with `adminOnly: true`, surfaces only to admins via {@link adminOnlyDailyModes},
 * and graduates to public by flipping the flag — no hub rewrite.
 *
 * Word Tower is the first mode driven by this: its daily run gives every player the
 * same letters for the day (see `lib/wordTower/dailySeed.ts`) and keeps a per-day best
 * + streak. Cross-day tower carryover ("continue building each day") is now LIVE — the
 * physical tower (floors/height/records) persists across UTC days while the wheel +
 * per-session mechanics refresh to each day's shared seed (see the HYBRID branch in
 * `restoreWordTowerState`, keyed on the save blob's `gameCode`).
 */

export type DailyModeId = 'word-hunt' | 'word-wheel' | 'word-tower' | 'connections';

export interface DailyModeDef {
  id: DailyModeId;
  /** Locale-relative path (the hub prefixes `/${locale}`). Keep any query intact. */
  path: string;
  /** Gated to admins until the mode is ready for the public daily flow. */
  adminOnly: boolean;
  /** i18n key for the card title. */
  titleKey: string;
  /** i18n key for the card tagline/description. */
  descKey: string;
  /** Accent family for the card chrome. */
  accent: 'orange' | 'yellow' | 'cyan' | 'purple';
}

export const DAILY_MODES: readonly DailyModeDef[] = [
  {
    id: 'word-hunt',
    path: '/daily/word-hunt',
    adminOnly: false,
    titleKey: 'daily.wordHunt.title',
    descKey: 'daily.wordHunt.desc',
    accent: 'orange',
  },
  {
    id: 'word-wheel',
    path: '/daily/word-wheel',
    adminOnly: false,
    titleKey: 'wordWheel.hub.wordWheelQuest',
    descKey: 'wordWheel.hub.wordWheelDesc',
    accent: 'yellow',
  },
  {
    id: 'word-tower',
    path: '/word-tower?daily=1',
    adminOnly: true,
    titleKey: 'wordTower.daily.questTitle',
    descKey: 'wordTower.daily.questDesc',
    accent: 'cyan',
  },
  {
    id: 'connections',
    path: '/connections/daily',
    adminOnly: true,
    titleKey: 'connections.daily.questTitle',
    descKey: 'connections.daily.questDesc',
    accent: 'purple',
  },
];

/** Modes a given viewer may see — admins see all; everyone else sees public ones. */
export function visibleDailyModes(isAdmin: boolean): DailyModeDef[] {
  return DAILY_MODES.filter((mode) => isAdmin || !mode.adminOnly);
}

/** The future-gated modes (admin-only) — what the hub surfaces in its admin section. */
export function adminOnlyDailyModes(): DailyModeDef[] {
  return DAILY_MODES.filter((mode) => mode.adminOnly);
}

/** Absolute locale-prefixed href for a mode, query preserved. */
export function dailyModeHref(mode: DailyModeDef, locale: string): string {
  return `/${locale}${mode.path}`;
}
