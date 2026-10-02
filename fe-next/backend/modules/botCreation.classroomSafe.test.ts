import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateBotName, createBot } from './botCreation';
import { CELEBRITY_BOTS } from './botCelebrities';

const isCeleb = (name: string) => CELEBRITY_BOTS.some((c) => name.includes(c.name));

describe('classroom bots never caricature real public figures', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Given the celebrity roll hits, When celebrities are off, Then a regular bot name is used', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { name } = generateBotName('hard', [], 'en', { celebrities: false });
    expect(isCeleb(name)).toBe(false);
  });

  it('Given a classroom practice round, When a bot is created with celebrities off, Then it is not a politician lookalike', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const bot = createBot('CLASS1', 'medium', {}, 'en', { celebrities: false });
    expect(isCeleb(bot.username)).toBe(false);
  });
});
