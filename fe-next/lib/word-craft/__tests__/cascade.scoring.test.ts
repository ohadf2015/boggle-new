import { describe, it, expect } from 'vitest';
import {
  scoreCascadeWord,
  lengthBonus,
  chainMultiplier,
  MAX_CHAIN_MULT,
} from '../cascade/scoring';
import type { PowerCard } from '../run/powerCards';

const tiles = (word: string, value = 1) =>
  word.split('').map((letter) => ({ letter, value, premium: null }));

describe('cascade/scoring', () => {
  describe('lengthBonus', () => {
    it.each([
      [3, 1.0],
      [4, 1.2],
      [5, 1.5],
      [6, 2.0],
      [7, 3.0],
      [8, 4.0],
      [12, 4.0],
    ])('len %d → %f', (len, expected) => {
      expect(lengthBonus(len)).toBe(expected);
    });

    it('returns 0 for sub-minimum length', () => {
      expect(lengthBonus(0)).toBe(0);
      expect(lengthBonus(2)).toBe(0);
    });
  });

  describe('chainMultiplier', () => {
    it('chainCount=1 → 1× (first word, no bonus)', () => {
      expect(chainMultiplier(1)).toBe(1);
    });

    it('chainCount=2 → 1.5×', () => {
      expect(chainMultiplier(2)).toBe(1.5);
    });

    it('chainCount=3 → 2.0×', () => {
      expect(chainMultiplier(3)).toBe(2.0);
    });

    it('caps at MAX_CHAIN_MULT', () => {
      expect(chainMultiplier(20)).toBe(MAX_CHAIN_MULT);
    });

    it('chainCount<=0 → 1×', () => {
      expect(chainMultiplier(0)).toBe(1);
      expect(chainMultiplier(-1)).toBe(1);
    });
  });

  describe('scoreCascadeWord', () => {
    it('scores a 3-letter word with no cards (length bonus 1.0)', () => {
      const score = scoreCascadeWord({
        wordTiles: tiles('ART', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      // base=3 chips × baseMult=1.0 lengthBonus × chainMult=1 → 3
      expect(score).toBe(3);
    });

    it('rewards longer words via lengthBonus', () => {
      const len4 = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      const len5 = scoreCascadeWord({
        wordTiles: tiles('STARE', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      // 4 * 1.2 = 4.8 → 4 (floor) ; 5 * 1.5 = 7.5 → 7
      expect(len4).toBe(4);
      expect(len5).toBe(7);
    });

    it('multiplies by chainCount via chainMultiplier', () => {
      const first = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      const second = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 2,
        wordIndexInRound: 0,
        activeCards: [],
      });
      // 4*1.2 = 4.8 first ; second = 4.8 * 1.5 = 7.2 → 7
      expect(first).toBe(4);
      expect(second).toBe(7);
    });

    it('integrates active cards via applyCardEffects', () => {
      const doublerCard: PowerCard = {
        id: 'doubler',
        rarity: 'common',
        scoreEffect: () => ({ addChips: 0, addMult: 0, mulMult: 2 }),
      };
      const plain = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      const withCard = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [doublerCard],
      });
      // plain = floor(4 * 1.2 * 1.0 * 1) = 4
      // withCard = floor(4 * 1.2 * 1.0 * 2) = 9 (9.6 floored)
      expect(plain).toBe(4);
      expect(withCard).toBe(9);
    });

    it('caps chainMultiplier even with extreme chains', () => {
      const score = scoreCascadeWord({
        wordTiles: tiles('STAR', 1),
        chainCount: 100,
        wordIndexInRound: 0,
        activeCards: [],
      });
      // 4 * 1.2 * MAX_CHAIN_MULT
      expect(score).toBe(Math.floor(4 * 1.2 * MAX_CHAIN_MULT));
    });

    it('returns 0 for sub-minimum length', () => {
      const score = scoreCascadeWord({
        wordTiles: tiles('AB', 1),
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      expect(score).toBe(0);
    });

    it('honors per-tile value in baseChips', () => {
      const wordTiles = [
        { letter: 'Q', value: 10, premium: null },
        { letter: 'A', value: 1, premium: null },
        { letter: 'T', value: 1, premium: null },
      ];
      const score = scoreCascadeWord({
        wordTiles,
        chainCount: 1,
        wordIndexInRound: 0,
        activeCards: [],
      });
      // (10+1+1) * 1.0 (len 3) * 1 = 12
      expect(score).toBe(12);
    });
  });
});
