import { vi, describe, it, expect } from 'vitest';

vi.mock('../../../modules/gameStateManager', () => ({ getGame: vi.fn(), addPlayerWord: vi.fn(), trackBotWord: vi.fn() }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { boardWordSource } from '../botClassic';
import type { Bot } from '../../../modules/botBehavior';

const makeBot = (words: string[]) =>
  ({ difficulty: 'medium', wordsToFind: [...words], wordsFound: [], currentWordIndex: 0 }) as unknown as Bot;

describe('board-word bots during a blizzard', () => {
  it('skips a frozen word and keeps it for after the thaw', () => {
    const bot = makeBot(['cat', 'dog']);
    let frozen = true;
    const source = boardWordSource(bot, (w) => frozen && w === 'cat');
    expect(source.pick()).toBe('dog');
    expect(source.pick()).toBeNull();
    frozen = false;
    expect(source.pick()).toBe('cat');
    expect(source.pick()).toBeUndefined();
  });

  it('waits a turn instead of stopping when every remaining word is frozen', () => {
    const bot = makeBot(['cat', 'cab']);
    const source = boardWordSource(bot, () => true);
    expect(source.pick()).toBeNull();
    expect(bot.wordsToFind.slice(bot.currentWordIndex).sort()).toEqual(['cab', 'cat']);
  });
});
