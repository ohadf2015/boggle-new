/**
 * botLifecycle.resyncBotsForNewGrid — stall bot during await window (M1).
 *
 * Bug: during resync, old `wordsToFind` + old `currentWordIndex` remain in
 * place while `prepareBotWords` awaits. Any scheduled submitBotWord tick
 * firing in that window submits a word from the previous (stale) grid.
 *
 * Fix: before awaiting, bump `currentWordIndex = wordsToFind.length` so
 * submitBotWord exits on the `currentWordIndex >= wordsToFind.length`
 * guard. Reset to 0 after prepareBotWords completes and replaces the list.
 */

import { vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { resyncBotsForNewGrid } from '../botLifecycle';
import type { Bot } from '../botBehavior';

function makeBot(): Bot {
  return {
    username: 'bot-alice',
    difficulty: 'medium',
    isActive: true,
    wordsToFind: ['old1', 'old2', 'old3'],
    currentWordIndex: 1, // Mid-progress through old words
    activeTimers: new Set(),
    foundWords: new Set(),
  } as any;
}

describe('resyncBotsForNewGrid — M1 stall during await', () => {
  it('stalls bot (currentWordIndex >= wordsToFind.length) while resync completes', async () => {
    const bot = makeBot();
    const oldWordsLength = bot.wordsToFind.length;
    const oldIndex = bot.currentWordIndex;

    // Call resync - it should stall the bot immediately by bumping currentWordIndex
    // to >= wordsToFind.length, then call prepareBotWords to get new words
    const done = resyncBotsForNewGrid([bot], [['A', 'T'], ['E', 'S']], 'en');

    // While awaiting prepareBotWords, currentWordIndex should be stalled at length
    // so any scheduled submitBotWord ticks don't execute
    expect(bot.currentWordIndex).toBeGreaterThanOrEqual(oldWordsLength);

    // Wait for resync to complete
    await done;

    // After resync completes, bot should have new words and reset index to 0
    // (The actual words depend on what prepareBotWords finds in the grid)
    expect(bot.currentWordIndex).toBe(0);
    // Bot should either have new words or empty list if none found in the grid
    expect(Array.isArray(bot.wordsToFind)).toBe(true);
  });
});
