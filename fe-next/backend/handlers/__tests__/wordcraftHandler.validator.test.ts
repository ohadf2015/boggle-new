import { vi, describe, it, expect } from 'vitest';

const { captured } = vi.hoisted(() => ({ captured: { validator: null as null | ((w: string) => Promise<boolean>) } }));

vi.mock('../../modules/wordcraftManager.js', () => ({
  initializeWordCraftMatch: () => ({ player1: { username: 'Ada', score: 0, rack: [] }, player2: { username: 'P2', score: 0, rack: [] }, turn: 'player1' }),
  startWordCraftClock: vi.fn(),
  getMatchState: () => undefined,
  submitWordCraftMove: async (_r: string, _p: string, _pl: unknown, _rack: unknown, validator: (w: string) => Promise<boolean>) => {
    captured.validator = validator;
    return { valid: false, error: 'TEST' };
  },
  submitWordCraftPass: vi.fn(),
  endWordCraftMatch: vi.fn(),
  getRemainingTurnTime: () => 0,
}));
vi.mock('../../modules/boggleSolver.js', async () => {
  const real = await vi.importActual<typeof import('../../modules/boggleSolver')>('../../modules/boggleSolver');
  return { ...real, getCachedTrie: () => real.buildTrie(new Set(['cat', 'cats'])) };
});
vi.mock('../../dictionary.js', () => ({
  isValidWordLoaded: async (w: string, lang: string) => lang === 'en' && ['cat', 'cats'].includes(w),
}));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: () => true }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

import { registerWordCraftHandlers } from '../wordcraftHandler';

describe('Wordcraft 1v1 word check', () => {
  it('accepts real words and rejects junk', async () => {
    const listeners: Record<string, (d: unknown) => unknown> = {};
    const socket = { id: 's1', on: (e: string, fn: (d: unknown) => unknown) => { listeners[e] = fn; }, emit: vi.fn(), join: vi.fn() };
    registerWordCraftHandlers({ sockets: { sockets: new Map() } } as never, socket as never);
    listeners.joinWordCraftRoom({ roomId: 'r1', username: 'Ada' });
    await listeners.submitWordCraftMove({ placements: [{ tileId: 't1', pos: { row: 0, col: 0 }, letter: 'c' }], rack: [{ id: 't1', letter: 'c' }] });

    expect(captured.validator).not.toBeNull();
    expect(await captured.validator!('CAT')).toBe(true);
    expect(await captured.validator!('cats')).toBe(true);
    expect(await captured.validator!('xqz')).toBe(false);
  });
});
