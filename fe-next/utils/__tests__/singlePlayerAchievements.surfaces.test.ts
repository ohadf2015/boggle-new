/**
 * Cross-surface invariant for single-player achievements.
 *
 * Two independent calculators decide what the player earned in one game:
 *   - checkLiveAchievements()      -> the in-game toast (AchievementQueueProvider)
 *   - calculateFinalAchievements() -> the results screen (SinglePlayerResults)
 *
 * They must not disagree. Anything that toasts mid-game has to still be in the
 * results list, or the player watches an achievement appear and then vanish.
 * The reverse is fine: the results pass also emits end-of-game aggregates
 * (PERFECTIONIST, MINIMALIST, ...) that cannot be known mid-round.
 *
 * This guards the SP achievement surfaces, which otherwise have no live test —
 * components/__tests__/SinglePlayerGame.achievements.test.tsx was quarantined in
 * vitest.config.ts and asserted against AchievementDock, now an orphan.
 */

import { describe, it, expect } from 'vitest';
import {
  checkLiveAchievements,
  calculateFinalAchievements,
  createAchievementState,
  type WordData,
} from '@/utils/singlePlayerAchievements';

const GAME_DURATION = 180;

/**
 * A deliberately rich game: long words, a long combo streak, fast early words
 * and a couple of misses. Built to trip as many live achievements as possible,
 * because a key that never fires cannot catch a divergence.
 */
function buildGame(): Array<{ word: string; valid: boolean; at: number; combo: number }> {
  const plays: Array<{ word: string; valid: boolean; at: number; combo: number }> = [];
  const words = [
    'cat', 'dog', 'bat', 'rat', 'cart', 'tract', 'carts', 'actor', 'ratio',
    'orbit', 'tailor', 'rations', 'creator', 'traction', 'cartoons', 'attractions',
    'oration', 'rotation', 'notation', 'creation', 'reaction', 'tractors',
  ];

  let combo = 0;
  words.forEach((word, i) => {
    // Front-load the words so the speed-based achievements are reachable.
    const at = Math.min(GAME_DURATION - 1, 2 + i * 2);
    combo += 1;
    plays.push({ word, valid: true, at, combo });
  });

  // Two misses late in the game — exercises the combo reset and the
  // accuracy-based achievements on the results side.
  plays.push({ word: 'zzzz', valid: false, at: GAME_DURATION - 10, combo: 0 });
  plays.push({ word: 'qqqq', valid: false, at: GAME_DURATION - 5, combo: 0 });

  return plays;
}

/** Replay the game through the live calculator the way useSinglePlayerCore does. */
function collectLiveKeys(plays: ReturnType<typeof buildGame>): {
  liveKeys: Set<string>;
  validated: WordData[];
  allWords: WordData[];
  maxCombo: number;
} {
  const state = createAchievementState();
  const liveKeys = new Set<string>();
  const validated: WordData[] = [];
  const allWords: WordData[] = [];
  let maxCombo = 0;

  for (const play of plays) {
    const entry: WordData = {
      word: play.word,
      score: play.word.length * 10,
      timestamp: play.at * 1000,
      timeSinceStart: play.at,
      isValid: play.valid,
      comboBonus: play.combo,
    };
    allWords.push(entry);

    if (!play.valid) continue;

    validated.push(entry);
    maxCombo = Math.max(maxCombo, play.combo);

    // useSinglePlayerCore.ts:367 passes the validated-so-far list, the current
    // word, and the combo AFTER this word.
    const unlocked = checkLiveAchievements(
      state,
      validated,
      play.word,
      true,
      play.at,
      play.combo,
      GAME_DURATION
    );
    unlocked.forEach(a => liveKeys.add(a.key));
  }

  return { liveKeys, validated, allWords, maxCombo };
}

describe('single-player achievements — in-game toast vs results screen', () => {
  it('emits achievements live, so there is something to compare', () => {
    const { liveKeys } = collectLiveKeys(buildGame());

    // Guards the fixture itself: a game that unlocks nothing would make the
    // subset assertion below vacuously true.
    expect(liveKeys.size).toBeGreaterThan(3);
    expect(liveKeys.has('FIRST_BLOOD')).toBe(true);
  });

  it('never toasts an achievement that is missing from the results list', () => {
    const { liveKeys, validated, allWords, maxCombo } = collectLiveKeys(buildGame());

    const finalKeys = new Set(
      calculateFinalAchievements(validated, allWords, GAME_DURATION, maxCombo).map(a => a.key)
    );

    const toastedButNotInResults = Array.from(liveKeys).filter(key => !finalKeys.has(key)).sort();
    expect(toastedButNotInResults).toEqual([]);
  });

  it('gives every emitted achievement an icon, on both surfaces', () => {
    const { validated, allWords, maxCombo } = collectLiveKeys(buildGame());
    const { liveKeys } = collectLiveKeys(buildGame());

    const final = calculateFinalAchievements(validated, allWords, GAME_DURATION, maxCombo);

    // A missing icon renders as an empty badge on the results screen and an
    // empty circle in the toast.
    expect(final.filter(a => !a.icon).map(a => a.key)).toEqual([]);
    expect(liveKeys.size).toBeGreaterThan(0);
  });
});
