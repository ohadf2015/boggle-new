import { describe, expect, it } from 'vitest';
import {
  botTuning,
  isBotDifficulty,
  shouldBotSkipTurn,
  DEFAULT_BOT_DIFFICULTY,
  BOT_DIFFICULTIES,
} from '../botDifficulty';

describe('botDifficulty', () => {
  it('defaults to easy so the out-of-the-box bot is beatable', () => {
    expect(DEFAULT_BOT_DIFFICULTY).toBe('easy');
  });

  it('lists all three difficulties in ascending strength', () => {
    expect(BOT_DIFFICULTIES).toEqual(['easy', 'medium', 'hard']);
  });

  it('easy caps word length below bingo length and widens the weak-play pool', () => {
    const easy = botTuning('easy');
    // maxLength < 7 means the bot can never play a 7-tile bingo.
    expect(easy.maxLength).toBeLessThan(7);
    expect(easy.maxLength).toBeLessThanOrEqual(4);
    // High variance → large pool skewed toward sub-optimal words.
    expect(easy.skillVariance).toBeGreaterThanOrEqual(4);
  });

  it('hard plays full-length (bingo-capable) near-optimal words', () => {
    const hard = botTuning('hard');
    expect(hard.maxLength).toBe(7);
    expect(hard.skillVariance).toBeLessThan(1);
  });

  it('strength increases monotonically: easy is weaker than medium is weaker than hard', () => {
    const e = botTuning('easy');
    const m = botTuning('medium');
    const h = botTuning('hard');
    // Longer allowed words = stronger.
    expect(e.maxLength).toBeLessThanOrEqual(m.maxLength);
    expect(m.maxLength).toBeLessThanOrEqual(h.maxLength);
    // Lower variance = stronger (picks closer to the best word).
    expect(e.skillVariance).toBeGreaterThan(m.skillVariance);
    expect(m.skillVariance).toBeGreaterThan(h.skillVariance);
  });

  it('easy applies the strongest downward selection skew (weakest word-pick bias)', () => {
    const e = botTuning('easy');
    const m = botTuning('medium');
    const h = botTuning('hard');
    // Higher skew = picks closer to the WORST word in the pool. Easy should be
    // the most skewed; strength still increases monotonically toward hard.
    expect(e.selectionSkew).toBeGreaterThan(m.selectionSkew);
    expect(m.selectionSkew).toBeGreaterThanOrEqual(h.selectionSkew);
    // Easy is meaningfully skewed below the legacy sqrt default of 1.
    expect(e.selectionSkew).toBeGreaterThan(1);
  });

  it('easy stops hunting the player entirely (zero capture aggression)', () => {
    const e = botTuning('easy');
    const m = botTuning('medium');
    const h = botTuning('hard');
    // captureAggression scales how hard the bot weights STEALING the player's
    // cells when ranking candidate words. In Conquest the winner holds the most
    // squares, so an aggressive thief is the dominant difficulty. The user's
    // "still too good" → easy must NOT seek steals at all (it still captures
    // incidentally, it just never goes out of its way to). Monotonic to hard.
    expect(e.captureAggression).toBe(0);
    expect(e.captureAggression).toBeLessThan(m.captureAggression);
    expect(m.captureAggression).toBeLessThan(h.captureAggression);
    expect(h.captureAggression).toBe(1);
  });

  it('easy skips turns often, hard never — the lever that makes difficulty FELT in a territory game', () => {
    const e = botTuning('easy');
    const m = botTuning('medium');
    const h = botTuning('hard');
    // Territory accrues ∝ tiles placed, so word-length/variance knobs barely
    // change the bot's claim rate. A per-turn skip chance is the one knob the
    // player actually feels: easy gives the player free turns, hard never does.
    expect(e.turnSkipChance).toBeGreaterThan(0.25);
    expect(e.turnSkipChance).toBeGreaterThan(m.turnSkipChance);
    expect(m.turnSkipChance).toBeGreaterThan(h.turnSkipChance);
    expect(h.turnSkipChance).toBe(0);
  });
});

describe('shouldBotSkipTurn', () => {
  it('skips when the roll lands under the skip chance', () => {
    // easy ~0.35 → a 0.1 roll skips.
    expect(shouldBotSkipTurn(botTuning('easy'), () => 0.1)).toBe(true);
  });

  it('plays when the roll lands above the skip chance', () => {
    expect(shouldBotSkipTurn(botTuning('easy'), () => 0.99)).toBe(false);
  });

  it('hard never skips regardless of the roll (turnSkipChance 0)', () => {
    expect(shouldBotSkipTurn(botTuning('hard'), () => 0)).toBe(false);
  });

  it('validates difficulty strings (for localStorage hydration)', () => {
    expect(isBotDifficulty('easy')).toBe(true);
    expect(isBotDifficulty('hard')).toBe(true);
    expect(isBotDifficulty('impossible')).toBe(false);
    expect(isBotDifficulty(null)).toBe(false);
    expect(isBotDifficulty(undefined)).toBe(false);
  });
});
