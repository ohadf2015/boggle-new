/**
 * Cross-feature locale parity guard.
 *
 * Regression guard for a class of prod bug found 2026-05-31: several features'
 * t() call-sites shipped while their translation keys were dropped on origin in
 * translation-file merge races — so users saw RAW KEYS. Unlike connections
 * (whole sub-blocks lost in 4 locales), these were scattered leaves, several of
 * them reached only via DYNAMIC keys (e.g. ReengagementBanner builds
 * `reengagement.${tier}`, BossMechanicTutorial builds
 * `adventure.bosses.twist.${type}`, AchievementGrid maps category labelKeys)
 * which the static `check:translations` scanner cannot see.
 *
 * This asserts every such key resolves to a non-empty string in ALL 5 locales,
 * and that interpolation placeholders survive translation. It complements
 * connections-locale-parity.test.ts.
 */

import { en } from '../translations/en.js';
import { he } from '../translations/he.js';
import { sv } from '../translations/sv.js';
import { ja } from '../translations/ja.js';
import { es } from '../translations/es.js';

const LOCALES: Record<string, Record<string, unknown>> = { en, he, sv, ja, es };

// Keys restored/authored 2026-05-31. Grouped by the surface that calls them.
const REQUIRED_KEYS: string[] = [
  // AchievementGrid filter labels (data-array labelKey → t(labelKey))
  'education.achievements.all',
  'education.achievements.skill',
  'education.achievements.consistency',
  'education.achievements.exploration',
  // Blast MP results badge
  'blast.mpResults.boardCleared',
  // Practice tutorial micro-tip
  'practice.tutorial.drag',
  // ReengagementBanner message tiers (dynamic: reengagement.${tier})
  'reengagement.goodToSeeYou',
  'reengagement.longTimeNoSee',
  'reengagement.missedYou',
  'reengagement.welcomeBack',
  // Boss mechanic tutorial
  'adventure.bosses.newMechanic',
  'adventure.bosses.tutorialGotIt',
  // Adventure end-of-level "words you missed" panel
  'adventure.game.missedWordsSummary',
  'adventure.game.showLess',
  'adventure.game.showMore',
  'adventure.game.wordsYouMissed',
  // Adventure level share card
  'adventure.share.bestWord',
  'adventure.share.perfectClear',
  'adventure.share.wordsFound',
  // Async challenge card
  'asyncChallenge.recentResults',
  // Email OTP login modal
  'auth.otp.codeSent',
  'auth.otp.enterCode',
  // Global command palette (Cmd+K)
  'common.navigation',
  'common.noResults',
  'common.search',
  'common.searchPlaceholder',
  'common.toClose',
  // Daily reward / streak toasts
  'daily.comeBackTomorrow',
  'daily.milestoneReached',
  'daily.rewardClaimed',
  'daily.streakFreezeEarned',
  // Multiplayer rank / win-streak teasers
  'multiplayer.nearRank',
  'multiplayer.oneMoreWin',
  'multiplayer.winStreak',
  // Invite-a-friend
  'multiplayerFlow.inviteFriend',
  // Word Hunt
  'wordHunt.categoryHint',
  'wordHunt.play',
  // Word of the Day
  'wotd.title',
];

// Keys whose value MUST keep an interpolation placeholder in every locale.
const PLACEHOLDER_KEYS: Record<string, string> = {
  'adventure.game.missedWordsSummary': '{{count}}',
  'multiplayer.winStreak': '{{count}}',
  'wordHunt.categoryHint': '{{category}}',
};

function resolve(dict: Record<string, unknown>, dotted: string): unknown {
  return dotted.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
}

describe('cross-feature locale parity (restored/authored 2026-05-31)', () => {
  for (const [code, dict] of Object.entries(LOCALES)) {
    describe(`locale: ${code}`, () => {
      for (const key of REQUIRED_KEYS) {
        it(`has ${key} as a non-empty string`, () => {
          const val = resolve(dict, key);
          expect(typeof val).toBe('string');
          expect((val as string).length).toBeGreaterThan(0);
        });
      }
      for (const [key, placeholder] of Object.entries(PLACEHOLDER_KEYS)) {
        it(`preserves ${placeholder} in ${key}`, () => {
          expect(resolve(dict, key)).toContain(placeholder);
        });
      }
    });
  }
});
