/**
 * Board-word bot pricing: a bot's deliberate "wrong word" (prepareBotWords
 * mixes some in for human-like mistakes) must MISS — never score live and then
 * vanish at results, which made a bot's live total drift from its results total.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const dict = vi.hoisted(() => ({ valid: new Set<string>() }));
vi.mock('../../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn(async () => {}),
  isDictionaryWord: vi.fn((w: string) => dict.valid.has(w)),
}));
vi.mock('../../../modules/communityWordManager', () => ({
  isWordCommunityValid: vi.fn(() => false),
  isWordValidForScoring: vi.fn((w: string) => w === 'slang'),
}));
const gsm = vi.hoisted(() => ({ addPlayerWord: vi.fn(), trackBotWord: vi.fn() }));
vi.mock('../../../modules/gameStateManager', () => ({ ...gsm, getGame: vi.fn() }));
vi.mock('../../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { quoteBoardWord, isScoringWord, classicBotRules } from '../botClassic';
import { getGame } from '../../../modules/gameStateManager';
import { calculateWordScore } from '@/shared/utils/scoring';
import type { BotRoundContext } from '../botEngine';
import type { Bot } from '../../../modules/botBehavior';

const ctx = { io: {}, gameCode: 'G', language: 'en', gameEndTime: Infinity } as unknown as BotRoundContext;
const bot = { comboLevel: 3 } as Bot;

describe('board-word bot pricing', () => {
  beforeEach(() => { dict.valid = new Set(['crane']); });

  it('prices a real word exactly like a human auto-validated word (combo included)', () => {
    expect(quoteBoardWord(ctx, bot, 'crane')).toEqual({ wordScore: calculateWordScore('crane', 3) });
  });

  it('a wrong word is a miss (no quote), same predicate as results validation', () => {
    expect(isScoringWord('crnae', 'en')).toBe(false);
    expect(quoteBoardWord(ctx, bot, 'crnae')).toBeNull();
  });

  it('community/scoring-valid words count, as they do at results', () => {
    expect(isScoringWord('slang', 'en')).toBe(true);
    expect(quoteBoardWord(ctx, bot, 'slang')).not.toBeNull();
  });

  it('aaa never scores, and classic does not pay for a 2-letter word', () => {
    dict.valid = new Set(['aaa', 'at']);
    vi.mocked(getGame).mockReturnValue({ gameMode: 'classic' } as never);
    expect(isScoringWord('aaa', 'en', 'classic')).toBe(false);
    expect(quoteBoardWord(ctx, bot, 'aaa')).toBeNull();
    expect(isScoringWord('at', 'en', 'classic')).toBe(false);
    expect(quoteBoardWord(ctx, bot, 'at')).toBeNull();
    vi.mocked(getGame).mockReturnValue({ gameMode: 'blast' } as never);
    expect(isScoringWord('at', 'en', 'blast')).toBe(true);
    expect(quoteBoardWord(ctx, bot, 'at')).not.toBeNull();
  });

  it('a missed (wrong) word is still recorded at 0 — visible in results and in the peer-validation pool, never credited', () => {
    classicBotRules.onMiss!(ctx, { ...bot, username: 'Botty' } as Bot, 'crnae');
    expect(gsm.addPlayerWord).toHaveBeenCalledWith('G', 'Botty', 'crnae', expect.objectContaining({ score: 0, isBot: true }));
    expect(gsm.trackBotWord).toHaveBeenCalledWith('G', 'crnae', 'Botty', 0);
  });
});
