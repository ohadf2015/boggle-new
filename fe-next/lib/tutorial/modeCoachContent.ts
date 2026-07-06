import type { CoachModeKey } from './modeCoachStore';

/**
 * Two-tier FTUE content registry — the single source of truth for "how do I
 * play this mode" coaching. Every mode has an entry, so nothing ships without a
 * modeCoach. Tiers, chosen from real first-game funnel data (PostHog, 60d):
 *
 *  - `rich`   — the four modes new players actually enter first (classic 97 /
 *               word-hunt 47 / blast 39 / wheel-rush 29). Animated gesture demo.
 *  - `simple` — everything else: an emoji + one short caption per step.
 *
 * Captions are i18n KEYS (resolved with `t()` at render) so the copy stays in
 * the 5 translation files and never hard-codes a string. Keep captions ≤6 words.
 */

export type CoachAccent = 'lime' | 'cyan' | 'pink' | 'purple';

/** Gesture demos the shared <CoachDemo> can animate; `icon` = static emoji. */
export type CoachDemoType =
  | 'icon'
  | 'drag' // trace adjacent letters
  | 'longWord' // longer word = more points
  | 'tapClue' // tap to reveal / guess (word hunt)
  | 'centerLetter' // must use the centre letter (wheel)
  | 'lockWord' // lock before a rival steals (wheel)
  | 'clearTiles' // clear cascading tiles (blast)
  | 'stack' // stack words to build height (tower)
  | 'connectGroup' // group four related words (connections)
  | 'chain'; // last letter starts next word (shiritori)

export interface CoachStep {
  /** Animation the demo renders; `icon` pairs with `emoji`. */
  demo: CoachDemoType;
  /** Emoji shown for `icon` steps (simple tier). */
  emoji?: string;
  /** i18n key for the ≤6-word caption. */
  captionKey: string;
}

export interface CoachContent {
  mode: CoachModeKey;
  tier: 'rich' | 'simple';
  accent: CoachAccent;
  titleKey: string;
  steps: CoachStep[];
  /** Optional "earn the most points" tip shown under the steps. */
  scoreTipKey?: string;
}

export const MODE_COACH: Record<CoachModeKey, CoachContent> = {
  // ── Tier 1: rich animated demos (the real new-player entry funnel) ──────────
  classic: {
    mode: 'classic',
    tier: 'rich',
    accent: 'lime',
    titleKey: 'modeCoach.classic.title',
    steps: [
      { demo: 'drag', captionKey: 'modeCoach.classic.step1' },
      { demo: 'longWord', captionKey: 'modeCoach.classic.step2' },
    ],
    scoreTipKey: 'modeCoach.classic.scoreTip',
  },
  wordHunt: {
    mode: 'wordHunt',
    tier: 'rich',
    accent: 'cyan',
    titleKey: 'modeCoach.wordHunt.title',
    steps: [
      { demo: 'tapClue', captionKey: 'modeCoach.wordHunt.step1' },
      { demo: 'drag', captionKey: 'modeCoach.wordHunt.step2' },
    ],
    scoreTipKey: 'modeCoach.wordHunt.scoreTip',
  },
  wheelRush: {
    mode: 'wheelRush',
    tier: 'rich',
    accent: 'pink',
    titleKey: 'modeCoach.wheelRush.title',
    steps: [
      { demo: 'centerLetter', captionKey: 'modeCoach.wheelRush.step1' },
      { demo: 'lockWord', captionKey: 'modeCoach.wheelRush.step2' },
    ],
    scoreTipKey: 'modeCoach.wheelRush.scoreTip',
  },
  blast: {
    mode: 'blast',
    tier: 'rich',
    accent: 'purple',
    titleKey: 'modeCoach.blast.title',
    steps: [
      { demo: 'drag', captionKey: 'modeCoach.blast.step1' },
      { demo: 'clearTiles', captionKey: 'modeCoach.blast.step2' },
    ],
    scoreTipKey: 'modeCoach.blast.scoreTip',
  },

  // ── Tier 2: simple icon + caption coaches for the rest ──────────────────────
  wordTower: {
    mode: 'wordTower',
    tier: 'simple',
    accent: 'cyan',
    titleKey: 'modeCoach.wordTower.title',
    steps: [
      { demo: 'stack', captionKey: 'modeCoach.wordTower.step1' },
      { demo: 'longWord', captionKey: 'modeCoach.wordTower.step2' },
    ],
    scoreTipKey: 'modeCoach.wordTower.scoreTip',
  },
  connections: {
    mode: 'connections',
    tier: 'simple',
    accent: 'purple',
    titleKey: 'modeCoach.connections.title',
    steps: [
      { demo: 'connectGroup', captionKey: 'modeCoach.connections.step1' },
      { demo: 'icon', emoji: '🎯', captionKey: 'modeCoach.connections.step2' },
    ],
    scoreTipKey: 'modeCoach.connections.scoreTip',
  },
  wordCraft: {
    mode: 'wordCraft',
    tier: 'simple',
    accent: 'lime',
    titleKey: 'modeCoach.wordCraft.title',
    steps: [
      { demo: 'icon', emoji: '🔤', captionKey: 'modeCoach.wordCraft.step1' },
      { demo: 'icon', emoji: '✨', captionKey: 'modeCoach.wordCraft.step2' },
    ],
  },
  crossword: {
    mode: 'crossword',
    tier: 'simple',
    accent: 'cyan',
    titleKey: 'modeCoach.crossword.title',
    steps: [
      { demo: 'icon', emoji: '✏️', captionKey: 'modeCoach.crossword.step1' },
      { demo: 'icon', emoji: '➡️', captionKey: 'modeCoach.crossword.step2' },
    ],
  },
  sealedBid: {
    mode: 'sealedBid',
    tier: 'simple',
    accent: 'pink',
    titleKey: 'modeCoach.sealedBid.title',
    steps: [
      { demo: 'icon', emoji: '🤫', captionKey: 'modeCoach.sealedBid.step1' },
      { demo: 'icon', emoji: '💎', captionKey: 'modeCoach.sealedBid.step2' },
    ],
  },
  shiritori: {
    mode: 'shiritori',
    tier: 'simple',
    accent: 'pink',
    titleKey: 'modeCoach.shiritori.title',
    steps: [
      { demo: 'chain', captionKey: 'modeCoach.shiritori.step1' },
      { demo: 'icon', emoji: '⏱️', captionKey: 'modeCoach.shiritori.step2' },
    ],
  },
  adventure: {
    mode: 'adventure',
    tier: 'simple',
    accent: 'cyan',
    titleKey: 'modeCoach.adventure.title',
    steps: [
      { demo: 'icon', emoji: '🗺️', captionKey: 'modeCoach.adventure.step1' },
      { demo: 'icon', emoji: '⚔️', captionKey: 'modeCoach.adventure.step2' },
    ],
  },
};

export const ALL_COACH_MODES = Object.keys(MODE_COACH) as CoachModeKey[];

export function getModeCoach(mode: CoachModeKey): CoachContent | undefined {
  return MODE_COACH[mode];
}
