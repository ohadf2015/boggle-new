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

const { mockPrepareBotWords } = vi.hoisted(() => ({
  mockPrepareBotWords: vi.fn(),
}));

vi.mock('../botBehavior', () => ({
  prepareBotWords: mockPrepareBotWords,
  calculateNextDelay: vi.fn(),
  submitBotWord: vi.fn(),
}));

import { resyncBotsForNewGrid } from '../botLifecycle';
import type { Bot } from '../botBehavior';

function makeBot(): Bot {
  return {
    username: 'bot-alice',
    difficulty: 'medium',
    isActive: true,
    wordsToFind: ['old1', 'old2', 'old3'],
    currentWordIndex: 0,
    activeTimers: new Set(),
    foundWords: new Set(),
  } as any;
}

describe('resyncBotsForNewGrid — M1 stall during await', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stalls bot (currentWordIndex >= wordsToFind.length) while prepareBotWords pending', async () => {
    const bot = makeBot();
    let release: () => void = () => {};
    const pending = new Promise<void>((r) => { release = r; });
    mockPrepareBotWords.mockImplementation(async (b: Bot) => {
      await pending;
      b.wordsToFind = ['new1', 'new2'];
    });

    const done = resyncBotsForNewGrid([bot], [['A']], 'en');

    // While awaiting, the bot must not be able to submit a stale word.
    expect(bot.currentWordIndex).toBeGreaterThanOrEqual(bot.wordsToFind.length);

    release();
    await done;

    // After resync completes, bot is ready to submit from fresh list.
    expect(bot.wordsToFind).toEqual(['new1', 'new2']);
    expect(bot.currentWordIndex).toBe(0);
  });
});
