/**
 * Tests for useSurvivalHints hook
 *
 * Tests progressive tier-based auto-clue system:
 * - Tier 1: reveal_letter (cost 1, repeatable until maxed)
 * - Tier 2: reveal_category (cost 2, one-time)
 * - Tier 3: example_sentence (cost 3, one-time)
 *
 * Key behavior: Must exhaust current tier before moving to next tier.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSurvivalHints } from '../useSurvivalHints';
import type { Language } from '@/types';
import { generateProgressiveHints, generateFallbackHints } from '@/utils/aiHintGenerator';

// Mock the AI hint generator to avoid API calls
vi.mock('@/utils/aiHintGenerator', () => {
  return {
    CLUE_SHOP_ITEMS: [
      {
        id: 'reveal_letter',
        name: 'Reveal Letter',
        description: 'Reveal a random letter',
        cost: 1,
        icon: '💡',
      },
      {
        id: 'reveal_category',
        name: 'Reveal Category',
        description: 'Show the word category',
        cost: 2,
        icon: '🏷️',
      },
      {
        id: 'example_sentence',
        name: 'Example Sentence',
        description: 'See the word used in a sentence',
        cost: 3,
        icon: '📝',
      },
    ],
    generateProgressiveHints: vi.fn().mockResolvedValue({
      hints: [{ level: 1, hint: '_ _ _ _ _', unlockCost: 0 }],
      category: 'Test Category',
      exampleSentence: 'Test sentence with _____.',
    }),
    generateFallbackHints: vi.fn().mockReturnValue({
      hints: [{ level: 1, hint: '_ _ _ _ _', unlockCost: 0 }],
      category: 'Unknown',
      exampleSentence: 'Test sentence.',
    }),
  };
});

// Mock word rarity to avoid complex calculations
const { mockGetWordRarity } = vi.hoisted(() => ({
  mockGetWordRarity: vi.fn().mockReturnValue(2), // Common word (not rare)
}));
vi.mock('@/utils/dailyChallenge/wordRarity', () => ({
  getWordRarity: mockGetWordRarity,
}));

describe('useSurvivalHints', () => {
  const defaultProps = {
    targetWord: 'APPLE',
    language: 'en' as Language,
    playWordAcceptedSound: vi.fn(),
    showToast: vi.fn(),
    t: (key: string) => key,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    (generateProgressiveHints as jest.Mock).mockResolvedValue({
      hints: [{ level: 1, hint: '_ _ _ _ _', unlockCost: 0 }],
      category: 'Test Category',
      exampleSentence: 'Test sentence with _____.',
    });
    
    (generateFallbackHints as jest.Mock).mockReturnValue({
      hints: [{ level: 1, hint: '_ _ _ _ _', unlockCost: 0 }],
      category: 'Unknown',
      exampleSentence: 'Test sentence.',
    });
  });

  describe('getNextAffordableClue - Progressive Tier System', () => {
    it('should return null when tokens are 0', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      const nextClue = result.current[1].getNextAffordableClue(0);
      expect(nextClue).toBeNull();
    });

    it('should return reveal_letter when tokens >= 1 and tier 1 available', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      const nextClue = result.current[1].getNextAffordableClue(1);
      expect(nextClue).not.toBeNull();
      expect(nextClue?.id).toBe('reveal_letter');
      expect(nextClue?.cost).toBe(1);
    });

    it('should return reveal_letter even when tokens >= 2 (stay on tier 1)', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Even with 2 tokens, should still return tier 1 clue
      const nextClue = result.current[1].getNextAffordableClue(2);
      expect(nextClue?.id).toBe('reveal_letter');
      expect(nextClue?.cost).toBe(1);
    });

    it('should return reveal_letter even when tokens >= 3 (stay on tier 1)', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Even with 3 tokens, should still return tier 1 clue
      const nextClue = result.current[1].getNextAffordableClue(3);
      expect(nextClue?.id).toBe('reveal_letter');
      expect(nextClue?.cost).toBe(1);
    });

    it('should move to tier 2 only when tier 1 is exhausted (all letters revealed)', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Reveal letters until only 1 is left (max reveal for 5-letter word is 4)
      // APPLE has 5 letters, can reveal up to 4
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });

      // Now tier 1 should be exhausted
      // With 2 tokens, should return reveal_category
      const nextClue = result.current[1].getNextAffordableClue(2);
      expect(nextClue?.id).toBe('reveal_category');
      expect(nextClue?.cost).toBe(2);
    });

    it('should return null when tier 1 exhausted but tokens < 2 (save for tier 2)', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Exhaust tier 1
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });

      // With only 1 token, should return null (saving for tier 2)
      const nextClue = result.current[1].getNextAffordableClue(1);
      expect(nextClue).toBeNull();
    });

    it('should move to tier 3 when tier 1 and 2 are exhausted', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Exhaust tier 1
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });

      // Exhaust tier 2
      act(() => {
        result.current[1].revealCategory();
      });

      // Now with 3 tokens, should return example_sentence
      const nextClue = result.current[1].getNextAffordableClue(3);
      expect(nextClue?.id).toBe('example_sentence');
      expect(nextClue?.cost).toBe(3);
    });

    it('should return null when all tiers are exhausted', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Exhaust all tiers
      // Tier 1
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      // Tier 2
      act(() => { result.current[1].revealCategory(); });
      // Tier 3
      act(() => { result.current[1].revealExample(); });

      // Should return null regardless of tokens
      expect(result.current[1].getNextAffordableClue(10)).toBeNull();
    });

    it('should handle short words (3 letters) with limited reveals', () => {
      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, targetWord: 'CAT' })
      );

      // CAT has 3 letters, can reveal up to 2
      act(() => { result.current[1].autoRevealLetter(); }); // 1st reveal
      act(() => { result.current[1].autoRevealLetter(); }); // 2nd reveal (now maxed)

      // Tier 1 should be exhausted, move to tier 2
      const nextClue = result.current[1].getNextAffordableClue(2);
      expect(nextClue?.id).toBe('reveal_category');
    });

    it('should handle 2-letter words with only 1 reveal possible', () => {
      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, targetWord: 'GO' })
      );

      // GO has 2 letters, can reveal only 1
      act(() => {
        result.current[1].autoRevealLetter(); // 1st reveal (now maxed)
      });

      // Tier 1 should be exhausted
      const nextClue = result.current[1].getNextAffordableClue(2);
      expect(nextClue?.id).toBe('reveal_category');
    });
  });

  describe('autoRevealLetter', () => {
    it('should return revealed index and reveal a letter when possible', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      let revealed = -1;
      act(() => {
        revealed = result.current[1].autoRevealLetter();
      });

      expect(revealed).toBeGreaterThanOrEqual(0);
      expect(result.current[0].revealedLetters.size).toBe(1);
    });

    it('should return -1 when max letters are revealed', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Reveal 4 letters (max for 5-letter word)
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });
      act(() => { result.current[1].autoRevealLetter(); });

      // 5th attempt should fail
      let revealed = 0;
      act(() => {
        revealed = result.current[1].autoRevealLetter();
      });

      expect(revealed).toBe(-1);
      expect(result.current[0].revealedLetters.size).toBe(4);
    });
  });

  describe('revealCategory', () => {
    it('should set showCategory to true', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      expect(result.current[0].showCategory).toBe(false);

      act(() => {
        result.current[1].revealCategory();
      });

      expect(result.current[0].showCategory).toBe(true);
    });
  });

  describe('revealExample', () => {
    it('should set showExample to true', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      expect(result.current[0].showExample).toBe(false);

      act(() => {
        result.current[1].revealExample();
      });

      expect(result.current[0].showExample).toBe(true);
    });
  });

  describe('auto-hint final letter protection', () => {
    it('should never include the last index in revealedLetters (explicit guard)', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Try to reveal many times
      for (let i = 0; i < 20; i++) {
        act(() => { result.current[1].autoRevealLetter(); });
      }

      // targetWord APPLE has length 5 => final index is 4
      expect(result.current[0].revealedLetters.has(4)).toBe(false);
    });

    it('autoUnlockNextHint should reveal a letter without touching last index and return the item', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      let item: { id: string } | null = null;
      act(() => {
        item = result.current[1].autoUnlockNextHint();
      });
      expect(item?.id).toBe('reveal_letter');
      expect(result.current[0].revealedLetters.has(4)).toBe(false);
      expect(result.current[0].revealedLetters.size).toBe(1);
    });

    it('autoUnlockNextHint should NOT spend tokens (no token arg / no setter used)', () => {
      // Signature must not accept a token setter — that proves it cannot deduct.
      const { result } = renderHook(() => useSurvivalHints(defaultProps));
      // autoUnlockNextHint takes zero args: length 0
      expect(result.current[1].autoUnlockNextHint.length).toBe(0);
    });

    it('should never auto-reveal the final letter - player must guess it', () => {
      // For a 5-letter word, should be able to reveal at most 4 letters
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Reveal letters one by one
      for (let i = 0; i < 10; i++) {
        act(() => { result.current[1].autoRevealLetter(); });
      }

      // Should have revealed exactly 4 letters (leaving 1 for the player)
      expect(result.current[0].revealedLetters.size).toBe(4);

      // canRevealLetter should now be false
      const nextClue = result.current[1].getNextAffordableClue(100);
      expect(nextClue?.id).not.toBe('reveal_letter');
    });

    it('should leave exactly 1 unrevealed letter for any word length', () => {
      // Test with 3-letter word
      const { result: result3 } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, targetWord: 'CAT' })
      );

      for (let i = 0; i < 10; i++) {
        act(() => { result3.current[1].autoRevealLetter(); });
      }
      expect(result3.current[0].revealedLetters.size).toBe(2); // 3-1 = 2

      // Test with 6-letter word
      const { result: result6 } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, targetWord: 'BANANA' })
      );

      for (let i = 0; i < 10; i++) {
        act(() => { result6.current[1].autoRevealLetter(); });
      }
      expect(result6.current[0].revealedLetters.size).toBe(5); // 6-1 = 5
    });
  });

  describe('no automatic first letter reveal', () => {
    it('should NOT auto-reveal first letter for any word regardless of rarity', () => {
      // Mock rare word (rarity >= 4)
      mockGetWordRarity.mockReturnValue(5); // LEGENDARY rarity

      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // No letters should be revealed automatically at initialization
      expect(result.current[0].revealedLetters.size).toBe(0);
    });

    it('should start with empty revealed letters set for common words', () => {
      // Rarity 2 is common (already mocked in beforeEach)
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // No letters should be revealed automatically
      expect(result.current[0].revealedLetters.size).toBe(0);
    });
  });

  describe('accumulatedClues awareness — last-letter protection', () => {
    it('canRevealLetter is false when only 1 letter hidden (gameplay greens cover the rest)', () => {
      // APPLE: gameplay reveals positions 0,1,2,3 via green feedback; only position 4 is hidden.
      // Without accumulatedClues awareness, unrevealedCount = 5 → canRevealLetter = true (BUG).
      const accumulatedClues = new Map([
        [0, { letter: 'A', type: 'green' as const }],
        [1, { letter: 'P', type: 'green' as const }],
        [2, { letter: 'P', type: 'green' as const }],
        [3, { letter: 'L', type: 'green' as const }],
      ]);

      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, accumulatedClues })
      );

      // nextHintItem should NOT be reveal_letter (only 1 truly hidden letter remains)
      const nextClue = result.current[1].getNextAffordableClue(10);
      expect(nextClue?.id).not.toBe('reveal_letter');
    });

    it('autoRevealLetter returns -1 when only 1 letter is hidden via gameplay clues', () => {
      const accumulatedClues = new Map([
        [0, { letter: 'A', type: 'green' as const }],
        [1, { letter: 'P', type: 'green' as const }],
        [2, { letter: 'P', type: 'green' as const }],
        [3, { letter: 'L', type: 'green' as const }],
      ]);

      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, accumulatedClues })
      );

      let revealed = 0;
      act(() => {
        revealed = result.current[1].autoRevealLetter();
      });

      expect(revealed).toBe(-1);
      expect(result.current[0].revealedLetters.size).toBe(0);
    });

    it('autoUnlockNextHint returns null when only 1 letter hidden via gameplay clues', () => {
      const accumulatedClues = new Map([
        [0, { letter: 'A', type: 'green' as const }],
        [1, { letter: 'P', type: 'green' as const }],
        [2, { letter: 'P', type: 'green' as const }],
        [3, { letter: 'L', type: 'green' as const }],
      ]);

      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, accumulatedClues })
      );

      let item: { id: string } | null = { id: 'placeholder' };
      act(() => {
        item = result.current[1].autoUnlockNextHint();
      });

      expect(item).toBeNull();
      expect(result.current[0].revealedLetters.size).toBe(0);
    });

    it('autoRevealLetter skips positions already in accumulatedClues', () => {
      // Positions 0 and 1 are green via gameplay; only positions 2,3 available (not lastIdx=4)
      const accumulatedClues = new Map([
        [0, { letter: 'A', type: 'green' as const }],
        [1, { letter: 'P', type: 'green' as const }],
      ]);

      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, accumulatedClues })
      );

      let revealed = -1;
      act(() => {
        revealed = result.current[1].autoRevealLetter();
      });

      // Should reveal position 2 or 3, NOT 0 or 1
      expect(revealed).not.toBe(0);
      expect(revealed).not.toBe(1);
      expect(revealed).not.toBe(4); // never last position
      expect(revealed).toBeGreaterThanOrEqual(0);
    });

    it('combined shop + gameplay reveals correctly gate to 1 hidden', () => {
      // Shop revealed position 0; gameplay revealed positions 1,2,3; only position 4 hidden
      const accumulatedClues = new Map([
        [1, { letter: 'P', type: 'green' as const }],
        [2, { letter: 'P', type: 'green' as const }],
        [3, { letter: 'L', type: 'green' as const }],
      ]);

      const { result } = renderHook(() =>
        useSurvivalHints({ ...defaultProps, accumulatedClues })
      );

      // Shop reveals position 0 first
      act(() => {
        result.current[1].autoRevealLetter();
      });

      // Now revealedLetters={0}, accumulatedClues covers 1,2,3 → only pos 4 hidden
      // canRevealLetter should be false now
      const nextClue = result.current[1].getNextAffordableClue(10);
      expect(nextClue?.id).not.toBe('reveal_letter');
    });
  });

  describe('integration: multiple token spending', () => {
    it('should allow buying multiple reveals before moving to next tier', () => {
      const { result } = renderHook(() => useSurvivalHints(defaultProps));

      // Simulate having 3 tokens and buying clues one by one
      // First purchase
      let clue1 = result.current[1].getNextAffordableClue(3);
      expect(clue1?.id).toBe('reveal_letter');

      act(() => {
        result.current[1].autoRevealLetter();
      });

      // Second purchase (still tier 1)
      let clue2 = result.current[1].getNextAffordableClue(2);
      expect(clue2?.id).toBe('reveal_letter');

      act(() => {
        result.current[1].autoRevealLetter();
      });

      // Third purchase (still tier 1)
      let clue3 = result.current[1].getNextAffordableClue(1);
      expect(clue3?.id).toBe('reveal_letter');

      act(() => { result.current[1].autoRevealLetter(); });

      // After 3 reveals, still have room for 1 more
      expect(result.current[0].revealedLetters.size).toBe(3);
    });
  });
});
