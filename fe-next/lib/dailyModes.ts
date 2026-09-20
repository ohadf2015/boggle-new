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
 * Word Tower was the first mode driven by this: its daily run gives every player the
 * same letters for the day (see `lib/wordTower/dailySeed.ts`) and keeps a per-day best
 * + streak. Cross-day tower carryover ("continue building each day") is now LIVE — the
 * physical tower (floors/height/records) persists across UTC days while the wheel +
 * per-session mechanics refresh to each day's shared seed (see the HYBRID branch in
 * `restoreWordTowerState`, keyed on the save blob's `gameCode`).
 *
 * Connections (Word Bridge) is the second graduate: the daily route hosts BOTH
 * flavors, alternating by UTC day — the classic 5-riddle chain and the pyramid
 * (see lib/connections/dailyVariant.ts). It stays a registry-driven generic card
 * like its beta days, but now public, with the hub feeding it a played-today
 * status so a cleared day reads like every other quest.
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
  /**
   * Mode artwork under `public/daily`. Lives here so the hub hero, the hub's
   * compact rows and the end-of-game handoff all show the SAME picture for a
   * mode. Previously each surface picked art with its own inline ternary, and
   * the one that had no Connections branch silently rendered the Word Hunt
   * mascot for Connections.
   */
  art: string;
}

export const DAILY_MODES: readonly DailyModeDef[] = [
  {
    id: 'word-hunt',
    path: '/daily/word-hunt',
    adminOnly: false,
    titleKey: 'daily.wordHunt.title',
    descKey: 'daily.wordHunt.desc',
    accent: 'orange',
    art: '/daily/word-hunt-mascot.jpg',
  },
  {
    id: 'word-wheel',
    path: '/daily/word-wheel',
    adminOnly: false,
    titleKey: 'wordWheel.hub.wordWheelQuest',
    descKey: 'wordWheel.hub.wordWheelDesc',
    accent: 'yellow',
    art: '/daily/word-wheel-mascot.jpg',
  },
  {
    id: 'word-tower',
    path: '/daily/word-tower',
    adminOnly: false,
    titleKey: 'wordTower.daily.questTitle',
    descKey: 'wordTower.daily.questDesc',
    accent: 'cyan',
    art: '/daily/word-tower-mascot.jpg',
  },
  {
    id: 'connections',
    path: '/connections/daily',
    adminOnly: false,
    titleKey: 'connections.daily.questTitle',
    descKey: 'connections.daily.questDesc',
    accent: 'purple',
    art: '/daily/connections-mascot.jpg',
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
 *  Word Hunt, Word Wheel and Word Tower are excluded because the hub draws them
 *  with the shared `QuestCard` box (same chrome, same quest chain, same SPA nav)
 *  — Word Tower graduated out of the generic card once it went public, because a
 *  first-class daily quest should not look different from its siblings.
 *  Everything still gated (Connections) is drawn generically. Splitting it here —
 *  instead of gating the section on `adminOnly` inside the hub — is what lets a
 *  mode graduate to public by flipping one boolean. */
const HERO_CARD_MODES: readonly DailyModeId[] = ['word-hunt', 'word-wheel', 'word-tower'];

export function questCardModes(isAdmin: boolean): DailyModeDef[] {
  return visibleDailyModes(isAdmin).filter((mode) => !HERO_CARD_MODES.includes(mode.id));
}

/** Absolute locale-prefixed href for a mode, query preserved. */
export function dailyModeHref(mode: DailyModeDef, locale: string): string {
  return `/${locale}${mode.path}`;
}

/** State of play for each daily mode. */
export interface DailyModePlayState {
  wordHunt: 'new' | 'won' | 'lost';
  wordWheel: 'new' | 'played';
  wordTower: boolean;
  connections: boolean;
}

/**
 * Determine which mode should be the primary action (most prominent on hub).
 *
 * Priority order: first unplayed mode in sequence, or word-hunt if all are played.
 * This ensures "what do I do right now" is answered by a single card.
 */
export function pickPrimaryMode(state: DailyModePlayState): DailyModeId {
  // Word Hunt unplayed (new or lost) → it's the primary
  if (state.wordHunt === 'new' || state.wordHunt === 'lost') {
    return 'word-hunt';
  }

  // Word Hunt played (won), Word Wheel unplayed → it's the primary
  if (state.wordWheel === 'new') {
    return 'word-wheel';
  }

  // First two played, Word Tower unplayed → it's the primary
  if (!state.wordTower) {
    return 'word-tower';
  }

  // First three played, Connections unplayed → it's the primary
  if (!state.connections) {
    return 'connections';
  }

  // All played → default to Word Hunt (safe fallback)
  return 'word-hunt';
}

/** Priority order the hub and the end-of-game handoff both follow. */
const MODE_PRIORITY: readonly DailyModeId[] = ['word-hunt', 'word-wheel', 'word-tower', 'connections'];

/** Has this mode been played today, per the unified play state? */
function isModePlayed(state: DailyModePlayState, id: DailyModeId): boolean {
  switch (id) {
    case 'word-hunt':
      return state.wordHunt !== 'new';
    case 'word-wheel':
      return state.wordWheel === 'played';
    case 'word-tower':
      return state.wordTower;
    case 'connections':
      return state.connections;
  }
}

/**
 * What to play NEXT once `justFinished` is done — the same priority order as
 * {@link pickPrimaryMode}, minus the mode just completed, and `null` when the
 * whole day is cleared.
 *
 * Distinct from pickPrimaryMode on purpose: that one falls back to 'word-hunt'
 * when everything is played, which is the right answer for a hub that must
 * always render a hero, and the WRONG answer for an end-of-game handoff, where
 * it would bounce the player back into a mode they already finished. Callers
 * must render the "come back tomorrow" state on null rather than a stale CTA.
 *
 * Note a LOST Word Hunt counts as played here: re-offering the mode the player
 * just failed is not a next step, and the retry affordance already exists on
 * the results screen itself.
 */
export function pickNextUnplayedMode(
  state: DailyModePlayState,
  justFinished: DailyModeId,
): DailyModeId | null {
  return (
    MODE_PRIORITY.find((id) => id !== justFinished && !isModePlayed(state, id)) ?? null
  );
}
