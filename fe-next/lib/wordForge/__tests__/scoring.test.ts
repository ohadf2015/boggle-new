/**
 * Word Forge Scoring Engine Tests
 *
 * TDD: Tests written first to validate the core formula:
 * Score = (Letter Points + Chip Bonuses) × Length Bonus × Mult Bonuses
 */

import {
  getLetterPoints,
  getBasePoints,
  getLengthBonus,
  getRoundTarget,
  isBossRound,
  scoreWord,
  calculateRunXp,
  getUnlockTier,
} from '../scoring';
import type { RuneCard, ScoringContext } from '@/types/wordForge';
import { RUNE_CATALOG } from '../runeCatalog';

// ─── Letter Points ─────────────────────────────────────────

describe('getLetterPoints', () => {
  it('returns 1 for common letters', () => {
    expect(getLetterPoints('E')).toBe(1);
    expect(getLetterPoints('A')).toBe(1);
    expect(getLetterPoints('T')).toBe(1);
  });

  it('returns high values for rare letters', () => {
    expect(getLetterPoints('Q')).toBe(10);
    expect(getLetterPoints('Z')).toBe(10);
    expect(getLetterPoints('J')).toBe(8);
    expect(getLetterPoints('X')).toBe(8);
  });

  it('handles lowercase', () => {
    expect(getLetterPoints('e')).toBe(1);
    expect(getLetterPoints('q')).toBe(10);
  });

  it('returns 0 for unknown characters', () => {
    expect(getLetterPoints('!')).toBe(0);
    expect(getLetterPoints(' ')).toBe(0);
  });
});

describe('getBasePoints', () => {
  it('sums letter points for a word', () => {
    // QUEST: Q(10) + U(1) + E(1) + S(1) + T(1) = 14
    expect(getBasePoints('QUEST')).toBe(14);
  });

  it('handles lowercase words', () => {
    expect(getBasePoints('quest')).toBe(14);
  });

  it('scores simple words correctly', () => {
    // CAT: C(3) + A(1) + T(1) = 5
    expect(getBasePoints('CAT')).toBe(5);
    // BRAVE: B(3) + R(1) + A(1) + V(4) + E(1) = 10
    expect(getBasePoints('BRAVE')).toBe(10);
  });
});

// ─── Length Bonus ──────────────────────────────────────────

describe('getLengthBonus', () => {
  it('returns ×1 for 3-letter words', () => {
    expect(getLengthBonus(3)).toBe(1);
  });

  it('returns ×1.5 for 4-letter words', () => {
    expect(getLengthBonus(4)).toBe(1.5);
  });

  it('returns ×2 for 5-letter words', () => {
    expect(getLengthBonus(5)).toBe(2);
  });

  it('returns ×3 for 6-letter words', () => {
    expect(getLengthBonus(6)).toBe(3);
  });

  it('returns ×5 for 7-letter words', () => {
    expect(getLengthBonus(7)).toBe(5);
  });

  it('returns ×8 for 8+ letter words', () => {
    expect(getLengthBonus(8)).toBe(8);
    expect(getLengthBonus(10)).toBe(8);
    expect(getLengthBonus(15)).toBe(8);
  });
});

// ─── Round Targets ─────────────────────────────────────────

describe('getRoundTarget', () => {
  it('returns correct targets for rounds 1-9', () => {
    expect(getRoundTarget(1)).toBe(50);
    expect(getRoundTarget(3)).toBe(120);
    expect(getRoundTarget(6)).toBe(300);
    expect(getRoundTarget(9)).toBe(750);
  });

  it('scales by 40% for endless rounds', () => {
    const round9 = getRoundTarget(9);
    const round10 = getRoundTarget(10);
    expect(round10).toBe(Math.round(round9 * 1.4));
  });
});

describe('isBossRound', () => {
  it('returns true for rounds 3, 6, 9', () => {
    expect(isBossRound(3)).toBe(true);
    expect(isBossRound(6)).toBe(true);
    expect(isBossRound(9)).toBe(true);
  });

  it('returns false for non-boss rounds', () => {
    expect(isBossRound(1)).toBe(false);
    expect(isBossRound(2)).toBe(false);
    expect(isBossRound(4)).toBe(false);
    expect(isBossRound(5)).toBe(false);
  });

  it('returns false for round 0', () => {
    expect(isBossRound(0)).toBe(false);
  });
});

// ─── Score Word (with runes) ───────────────────────────────

function makeContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    word: 'TEST',
    previousWord: null,
    comboCount: 0,
    elapsedSeconds: 10,
    wordFindTime: 5,
    round: 1,
    isBossRound: false,
    bossConstraintId: null,
    grid: [],
    wordsThisRound: [],
    allWordsThisRun: [],
    ...overrides,
  };
}

function makeRuneCard(id: string): RuneCard {
  const def = RUNE_CATALOG.find(r => r.id === id);
  if (!def) throw new Error(`Rune ${id} not found in catalog`);
  return { def, instanceId: `test-${id}` };
}

describe('scoreWord', () => {
  it('scores correctly with no runes', () => {
    const result = scoreWord([], makeContext({ word: 'CAT' }));
    // CAT: base=5, length bonus=×1 (3 letters), no runes
    expect(result.basePoints).toBe(5);
    expect(result.lengthBonus).toBe(1);
    expect(result.totalScore).toBe(5);
    expect(result.runeEffects).toHaveLength(0);
  });

  it('applies length bonus correctly', () => {
    const result = scoreWord([], makeContext({ word: 'BRAVE' }));
    // BRAVE: base=10, length bonus=×2 (5 letters)
    expect(result.basePoints).toBe(10);
    expect(result.lengthBonus).toBe(2);
    expect(result.totalScore).toBe(20);
  });

  it('applies chip rune (vowelMiner)', () => {
    const runes = [makeRuneCard('vowelMiner')];
    const result = scoreWord(runes, makeContext({ word: 'BRAVE' }));
    // BRAVE has 2 vowels (A, E) → +6 chips
    // (10 + 6) × 2 = 32
    expect(result.totalScore).toBe(32);
    expect(result.runeEffects).toHaveLength(1);
    expect(result.runeEffects[0].type).toBe('addPoints');
    expect(result.runeEffects[0].value).toBe(6);
  });

  it('applies mult rune (wordSmith)', () => {
    const runes = [makeRuneCard('wordSmith')];
    const result = scoreWord(runes, makeContext({ word: 'BRAVE' }));
    // BRAVE: base=10, length=×2, wordSmith=×1.5
    // 10 × 2 × 1.5 = 30
    expect(result.totalScore).toBe(30);
    expect(result.runeEffects[0].type).toBe('multiply');
  });

  it('does not trigger wordSmith for short words', () => {
    const runes = [makeRuneCard('wordSmith')];
    const result = scoreWord(runes, makeContext({ word: 'CAT' }));
    // CAT: 3 letters, wordSmith requires 5+
    expect(result.totalScore).toBe(5);
    expect(result.runeEffects).toHaveLength(0);
  });

  it('stacks chip and mult runes', () => {
    const runes = [makeRuneCard('vowelMiner'), makeRuneCard('wordSmith')];
    const result = scoreWord(runes, makeContext({ word: 'BRAVE' }));
    // BRAVE: (10 + 6) × 2 × 1.5 = 48
    expect(result.totalScore).toBe(48);
    expect(result.runeEffects).toHaveLength(2);
  });

  it('applies alliteration when words start with same letter', () => {
    const runes = [makeRuneCard('alliteration')];
    const result = scoreWord(runes, makeContext({
      word: 'BRAVE',
      previousWord: 'BOLD',
    }));
    // BRAVE: 10 × 2 × 2 (alliteration) = 40
    expect(result.totalScore).toBe(40);
  });

  it('does not apply alliteration for different start letters', () => {
    const runes = [makeRuneCard('alliteration')];
    const result = scoreWord(runes, makeContext({
      word: 'BRAVE',
      previousWord: 'TOWER',
    }));
    expect(result.totalScore).toBe(20); // No alliteration bonus
  });

  it('applies firstBlood only on first word', () => {
    const runes = [makeRuneCard('firstBlood')];

    const first = scoreWord(runes, makeContext({
      word: 'CAT',
      wordsThisRound: [],
    }));
    // CAT: (5 + 15) × 1 = 20
    expect(first.totalScore).toBe(20);

    const second = scoreWord(runes, makeContext({
      word: 'CAT',
      wordsThisRound: ['DOG'],
    }));
    // Not first word — no bonus
    expect(second.totalScore).toBe(5);
  });
});

// ─── Scenario: Can a player hit targets? ───────────────────

describe('target achievability scenarios', () => {
  it('round 1 (target 50): achievable with 5-6 common words', () => {
    // Average 3-letter word: ~4 base × 1 length = 4 points
    // Average 4-letter word: ~6 base × 1.5 length = 9 points
    // Average 5-letter word: ~8 base × 2 length = 16 points
    // Mix of 8-10 words in 60 seconds = 50-80 points ✓
    const words = ['CAT', 'DOG', 'BRAVE', 'TOWER', 'LINE', 'HELP', 'QUEST'];
    let total = 0;
    for (const word of words) {
      const result = scoreWord([], makeContext({ word }));
      total += result.totalScore;
    }
    expect(total).toBeGreaterThanOrEqual(50);
  });

  it('round 5 with runes: can hit 220 with rune synergies', () => {
    const runes = [
      makeRuneCard('vowelMiner'),
      makeRuneCard('wordSmith'),
      makeRuneCard('longHaul'),
    ];
    const words = ['BRAVE', 'TOWER', 'QUEST', 'LINES', 'GUILD', 'CRATE', 'STAMP'];
    let total = 0;
    for (const word of words) {
      const result = scoreWord(runes, makeContext({ word }));
      total += result.totalScore;
    }
    expect(total).toBeGreaterThanOrEqual(220);
  });
});

// ─── XP Calculation ────────────────────────────────────────

describe('calculateRunXp', () => {
  it('gives XP based on rounds and words', () => {
    const xp = calculateRunXp(5, 20, 500, false);
    // 5 rounds × 10 = 50, 20 words × 0.5 = 10, 500/100 = 5, no win
    expect(xp).toBe(65);
  });

  it('gives win bonus', () => {
    const xpLoss = calculateRunXp(9, 40, 2000, false);
    const xpWin = calculateRunXp(9, 40, 2000, true);
    expect(xpWin - xpLoss).toBe(50);
  });
});

describe('getUnlockTier', () => {
  it('returns 0 for <100 XP', () => {
    expect(getUnlockTier(0)).toBe(0);
    expect(getUnlockTier(99)).toBe(0);
  });

  it('returns correct tiers', () => {
    expect(getUnlockTier(100)).toBe(1);
    expect(getUnlockTier(300)).toBe(2);
    expect(getUnlockTier(600)).toBe(3);
    expect(getUnlockTier(1000)).toBe(4);
    expect(getUnlockTier(1500)).toBe(5);
  });
});
