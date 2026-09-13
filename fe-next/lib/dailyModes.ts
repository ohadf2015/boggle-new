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
 * Connections (Word Bridge) is the daily route's third mode: it hosts BOTH
 * flavors, alternating by UTC day — the classic 5-riddle chain and the pyramid
 * (see lib/connections/dailyVariant.ts). It is a registry-driven generic card,
 * public, with the hub feeding it a played-today status so a cleared day reads
 * like every other quest.
 *
 * Word Tower was REMOVED from this registry (Ohad product directive 2026-09-13):
 * the mode is hidden from all consumer surfaces, so it no longer gets a daily
 * quest card and no longer counts in the hub /N progress denominator. Its
 * routes (/word-tower, /word-tower-v2, /daily/word-tower) stay alive and
 * playable for anyone with a direct link — this is a visibility change, not a
 * takedown.
 */

export type DailyModeId = 'word-hunt' | 'word-wheel' | 'connections';

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
    id: 'connections',
    path: '/connections/daily',
    adminOnly: false,
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

/** Modes the hub renders from the REGISTRY as generic quest cards.
 *
 *  Word Hunt and Word Wheel are excluded because the hub draws them with the
 *  shared `QuestCard` box (same chrome, same quest chain, same SPA nav).
 *  Connections is drawn generically. Splitting it here — instead of gating the
 *  section on `adminOnly` inside the hub — is what lets a mode graduate to
 *  public by flipping one boolean. */
const HERO_CARD_MODES: readonly DailyModeId[] = ['word-hunt', 'word-wheel'];

export function questCardModes(isAdmin: boolean): DailyModeDef[] {
  return visibleDailyModes(isAdmin).filter((mode) => !HERO_CARD_MODES.includes(mode.id));
}

/** Absolute locale-prefixed href for a mode, query preserved. */
export function dailyModeHref(mode: DailyModeDef, locale: string): string {
  return `/${locale}${mode.path}`;
}
