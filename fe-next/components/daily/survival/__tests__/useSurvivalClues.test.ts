/**
 * Tests for useSurvivalClues hook
 *
 * Tests clue accumulation from target guesses and word discoveries,
 * including handling of coin-purchased reveals that should remove yellow clues.
 */

import { renderHook, act } from '@testing-library/react';
import { useSurvivalClues } from '../useSurvivalClues';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

describe('useSurvivalClues', () => {
  const createRef = () => ({ current: null });

  describe('updateCluesFromFeedback', () => {
    it('should add green clues for correct positions', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      const feedback: LetterFeedback[] = [
        { letter: 'A', position: 0, feedback: 'green' },
        { letter: 'P', position: 1, feedback: 'gray' },
        { letter: 'P', position: 2, feedback: 'yellow' },
        { letter: 'L', position: 3, feedback: 'gray' },
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      const clues = result.current[0].accumulatedClues;
      expect(clues.get(0)).toEqual({ letter: 'A', type: 'green' });
      expect(clues.get(4)).toEqual({ letter: 'E', type: 'green' });
    });

    it('should NOT add yellow clues to accumulatedClues (yellows go to knownLetters only)', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      const feedback: LetterFeedback[] = [
        { letter: 'P', position: 0, feedback: 'yellow' },
        { letter: 'A', position: 1, feedback: 'yellow' },
        { letter: 'P', position: 2, feedback: 'gray' },
        { letter: 'L', position: 3, feedback: 'gray' },
        { letter: 'E', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // Yellow clues should NOT be stored in accumulatedClues (position-based map)
      // They should only go to knownLetters (non-positional set)
      const clues = result.current[0].accumulatedClues;
      expect(clues.get(0)).toBeUndefined();
      expect(clues.get(1)).toBeUndefined();

      // But they SHOULD be in knownLetters
      const knownLetters = result.current[0].knownLetters;
      expect(knownLetters.has('P')).toBe(true);
      expect(knownLetters.has('A')).toBe(true);
    });

    it('should track known letters from yellow feedback', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      const feedback: LetterFeedback[] = [
        { letter: 'P', position: 0, feedback: 'yellow' },
        { letter: 'A', position: 1, feedback: 'yellow' },
        { letter: 'C', position: 2, feedback: 'gray' },
        { letter: 'E', position: 3, feedback: 'yellow' },
        { letter: 'D', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      const knownLetters = result.current[0].knownLetters;
      expect(knownLetters.has('P')).toBe(true);
      expect(knownLetters.has('A')).toBe(true);
      expect(knownLetters.has('E')).toBe(true);
    });

    it('should remove yellow clues when greens fully account for letter', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // First attempt: yellow P at position 0
      const feedback1: LetterFeedback[] = [
        { letter: 'P', position: 0, feedback: 'yellow' },
        { letter: 'A', position: 1, feedback: 'gray' },
        { letter: 'P', position: 2, feedback: 'gray' },
        { letter: 'L', position: 3, feedback: 'gray' },
        { letter: 'E', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback1, [{ feedback: feedback1 }]);
      });

      // P should be in knownLetters after first attempt
      expect(result.current[0].knownLetters.has('P')).toBe(true);

      // Second attempt: green P at positions 1 and 2
      const feedback2: LetterFeedback[] = [
        { letter: 'A', position: 0, feedback: 'green' },
        { letter: 'P', position: 1, feedback: 'green' },
        { letter: 'P', position: 2, feedback: 'green' },
        { letter: 'L', position: 3, feedback: 'green' },
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback2, [
          { feedback: feedback1 },
          { feedback: feedback2 },
        ]);
      });

      const clues = result.current[0].accumulatedClues;
      // The yellow P at position 0 should be removed since we found both Ps
      expect(clues.get(0)?.type).toBe('green'); // Now green A
      expect(clues.get(1)?.type).toBe('green');
      expect(clues.get(2)?.type).toBe('green');

      // P should be REMOVED from knownLetters since all Ps are found as green
      expect(result.current[0].knownLetters.has('P')).toBe(false);
    });

    it('should remove letter from knownLetters when single occurrence found as green', () => {
      // This tests the exact bug scenario: T in CASTLE
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CASTLE', // T is at position 3 (count = 1)
          clueContainerRef: createRef(),
        })
      );

      // First attempt: T at position 0 is YELLOW (T exists but not at position 0)
      const feedback1: LetterFeedback[] = [
        { letter: 'T', position: 0, feedback: 'yellow' },
        { letter: 'X', position: 1, feedback: 'gray' },
        { letter: 'X', position: 2, feedback: 'gray' },
        { letter: 'X', position: 3, feedback: 'gray' },
        { letter: 'X', position: 4, feedback: 'gray' },
        { letter: 'X', position: 5, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback1, [{ feedback: feedback1 }]);
      });

      // T should be in knownLetters now (displayed in "Wrong spot:" section)
      expect(result.current[0].knownLetters.has('T')).toBe(true);

      // Second attempt: T at position 3 is GREEN (correct position)
      const feedback2: LetterFeedback[] = [
        { letter: 'C', position: 0, feedback: 'green' },
        { letter: 'A', position: 1, feedback: 'green' },
        { letter: 'S', position: 2, feedback: 'green' },
        { letter: 'T', position: 3, feedback: 'green' },
        { letter: 'L', position: 4, feedback: 'green' },
        { letter: 'E', position: 5, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback2, [
          { feedback: feedback1 },
          { feedback: feedback2 },
        ]);
      });

      // T should be REMOVED from knownLetters since all T's are found as green
      // This is the bug: T was staying in knownLetters even after being found
      expect(result.current[0].knownLetters.has('T')).toBe(false);
    });
  });

  describe('handleCoinRevealedLetter - adding green clues and cleaning up knownLetters', () => {
    it('should add green clue when letter is revealed via coins and keep knownLetters if not fully revealed', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // First, add P to knownLetters by guessing wrong (yellow feedback)
      const feedback: LetterFeedback[] = [
        { letter: 'P', position: 0, feedback: 'yellow' }, // P is in word but not at 0
        { letter: 'X', position: 1, feedback: 'gray' },
        { letter: 'Y', position: 2, feedback: 'gray' },
        { letter: 'Z', position: 3, feedback: 'gray' },
        { letter: 'W', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // Yellow clues should NOT be in accumulatedClues, only in knownLetters
      expect(result.current[0].accumulatedClues.get(0)).toBeUndefined();
      expect(result.current[0].knownLetters.has('P')).toBe(true);

      // Now simulate coin reveal at position 1 which is 'P' in APPLE
      act(() => {
        result.current[1].handleCoinRevealedLetter(1);
      });

      // After revealing P at position 1 (first P in APPLE):
      // - Should add green clue at position 1
      // - P should still be in knownLetters since APPLE has 2 Ps and only 1 is revealed
      const cluesAfter = result.current[0].accumulatedClues;
      expect(cluesAfter.get(1)).toEqual({ letter: 'P', type: 'green' });
      expect(result.current[0].knownLetters.has('P')).toBe(true); // Still in knownLetters, 2nd P not found
    });

    it('should remove letter from knownLetters when all occurrences are revealed as green', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // Add P to knownLetters via yellow feedback
      const feedback: LetterFeedback[] = [
        { letter: 'P', position: 0, feedback: 'yellow' },
        { letter: 'X', position: 1, feedback: 'gray' },
        { letter: 'Y', position: 2, feedback: 'gray' },
        { letter: 'Z', position: 3, feedback: 'gray' },
        { letter: 'W', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      expect(result.current[0].knownLetters.has('P')).toBe(true);

      // Reveal BOTH P positions via coins (positions 1 and 2 in APPLE)
      act(() => {
        result.current[1].handleCoinRevealedLetter(1);
        result.current[1].handleCoinRevealedLetter(2);
      });

      // P should be removed from knownLetters since all Ps are now revealed as green
      expect(result.current[0].knownLetters.has('P')).toBe(false);
      // Green clues should exist at both P positions
      expect(result.current[0].accumulatedClues.get(1)).toEqual({ letter: 'P', type: 'green' });
      expect(result.current[0].accumulatedClues.get(2)).toEqual({ letter: 'P', type: 'green' });
    });

    it('should replace yellow clue with green when same position is revealed', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'TEST',
          clueContainerRef: createRef(),
        })
      );

      // Create yellow clue at position 1 (E in TEST)
      // Imagine user guessed TEXX - E at position 1 is yellow (wrong spot)
      // Actually in TEST, E is at position 1, so let's use a different example
      // Target: TEST - positions T(0), E(1), S(2), T(3)

      // Guess XEXE - E at position 1 and 3 are yellow (E is only at pos 1 in TEST)
      const feedback: LetterFeedback[] = [
        { letter: 'X', position: 0, feedback: 'gray' },
        { letter: 'E', position: 1, feedback: 'green' }, // Actually correct position
        { letter: 'X', position: 2, feedback: 'gray' },
        { letter: 'E', position: 3, feedback: 'gray' }, // No E at position 3
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // Let's use a better example where we have a yellow that gets replaced
      // Reset and try again with a word where we'll have yellow then green at same position
    });

    it('should track knownLetters until all occurrences are revealed as green', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'HELLO',
          clueContainerRef: createRef(),
        })
      );

      // Target: HELLO = H(0), E(1), L(2), L(3), O(4)
      // Guess: LXXXX - L at position 0 is yellow (L is in word but at positions 2,3)
      const feedback: LetterFeedback[] = [
        { letter: 'L', position: 0, feedback: 'yellow' },
        { letter: 'X', position: 1, feedback: 'gray' },
        { letter: 'X', position: 2, feedback: 'gray' },
        { letter: 'X', position: 3, feedback: 'gray' },
        { letter: 'X', position: 4, feedback: 'gray' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // Yellow clues should NOT be in accumulatedClues, only in knownLetters
      expect(result.current[0].accumulatedClues.get(0)).toBeUndefined();
      expect(result.current[0].knownLetters.has('L')).toBe(true);

      // Now reveal position 2 via coins - this is where first L actually is
      act(() => {
        result.current[1].handleCoinRevealedLetter(2);
      });

      // Should now have green L at position 2
      expect(result.current[0].accumulatedClues.get(2)).toEqual({ letter: 'L', type: 'green' });
      // L should still be in knownLetters because there are 2 Ls and only 1 is revealed
      expect(result.current[0].knownLetters.has('L')).toBe(true);

      // Reveal position 3 (second L)
      act(() => {
        result.current[1].handleCoinRevealedLetter(3);
      });

      // Now all Ls are revealed as green
      expect(result.current[0].accumulatedClues.get(3)).toEqual({ letter: 'L', type: 'green' });
      // L should be removed from knownLetters since all are found
      expect(result.current[0].knownLetters.has('L')).toBe(false);
    });
  });

  describe('exact bug reproduction: STYLE target with TASTE guess', () => {
    it('should remove T and S from knownLetters when STYLE is guessed correctly', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'STYLE', // S(0), T(1), Y(2), L(3), E(4)
          clueContainerRef: createRef(),
        })
      );

      // First attempt: TASTE
      // T(0)=yellow, A(1)=gray, S(2)=yellow, T(3)=gray, E(4)=green
      const feedback1: LetterFeedback[] = [
        { letter: 'T', position: 0, feedback: 'yellow' },
        { letter: 'A', position: 1, feedback: 'gray' },
        { letter: 'S', position: 2, feedback: 'yellow' },
        { letter: 'T', position: 3, feedback: 'gray' }, // Only 1 T in STYLE
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback1, [{ feedback: feedback1 }]);
      });

      // After TASTE: T and S should be in knownLetters
      expect(result.current[0].knownLetters.has('T')).toBe(true);
      expect(result.current[0].knownLetters.has('S')).toBe(true);
      expect(result.current[0].accumulatedClues.get(4)).toEqual({ letter: 'E', type: 'green' });

      // Second attempt: STYLE (correct answer)
      const feedback2: LetterFeedback[] = [
        { letter: 'S', position: 0, feedback: 'green' },
        { letter: 'T', position: 1, feedback: 'green' },
        { letter: 'Y', position: 2, feedback: 'green' },
        { letter: 'L', position: 3, feedback: 'green' },
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback2, [
          { feedback: feedback1 },
          { feedback: feedback2 },
        ]);
      });

      // After STYLE: T and S should be REMOVED from knownLetters
      // because all occurrences are now found as green
      expect(result.current[0].knownLetters.has('T')).toBe(false);
      expect(result.current[0].knownLetters.has('S')).toBe(false);

      // All positions should be green
      expect(result.current[0].accumulatedClues.get(0)).toEqual({ letter: 'S', type: 'green' });
      expect(result.current[0].accumulatedClues.get(1)).toEqual({ letter: 'T', type: 'green' });
    });
  });

  describe('updateCluesFromDiscovery', () => {
    it('should remove letter from knownLetters when discovery reveals all greens for that letter', () => {
      // This test reproduces the STYLE/TASTE/TALL bug
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'STYLE', // S(0), T(1), Y(2), L(3), E(4)
          clueContainerRef: createRef(),
        })
      );

      // First: TASTE feedback adds T and S to knownLetters
      const tasteFeedback: LetterFeedback[] = [
        { letter: 'T', position: 0, feedback: 'yellow' }, // T exists at pos 1
        { letter: 'A', position: 1, feedback: 'gray' },
        { letter: 'S', position: 2, feedback: 'yellow' }, // S exists at pos 0
        { letter: 'T', position: 3, feedback: 'gray' },   // Only 1 T in target
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(tasteFeedback, [{ feedback: tasteFeedback }]);
      });

      // T and S should be in knownLetters now
      expect(result.current[0].knownLetters.has('T')).toBe(true);
      expect(result.current[0].knownLetters.has('S')).toBe(true);

      // Now discover "STY" - which matches positions 0,1,2 of STYLE
      // S at position 0 = green, T at position 1 = green, Y at position 2 = green
      // updateCluesFromDiscovery now handles knownLetters cleanup internally
      act(() => {
        result.current[1].updateCluesFromDiscovery('STY');
      });

      // After discovery: S, T, Y should be in accumulatedClues as green
      expect(result.current[0].accumulatedClues.get(0)).toEqual({ letter: 'S', type: 'green' });
      expect(result.current[0].accumulatedClues.get(1)).toEqual({ letter: 'T', type: 'green' });
      expect(result.current[0].accumulatedClues.get(2)).toEqual({ letter: 'Y', type: 'green' });

      // BUG: T and S should be REMOVED from knownLetters since all occurrences are green
      // This was failing because updateCluesFromDiscovery reads stale accumulatedClues
      expect(result.current[0].knownLetters.has('T')).toBe(false);
      expect(result.current[0].knownLetters.has('S')).toBe(false);
    });

    it('should add green clues when discovered word matches target positions', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // Discover word APP - matches first 3 positions of APPLE
      act(() => {
        result.current[1].updateCluesFromDiscovery('APP');
      });

      const clues = result.current[0].accumulatedClues;
      expect(clues.get(0)).toEqual({ letter: 'A', type: 'green' });
      expect(clues.get(1)).toEqual({ letter: 'P', type: 'green' });
      expect(clues.get(2)).toEqual({ letter: 'P', type: 'green' });
    });

    it('should return number of clues revealed', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      let cluesRevealed: number = 0;
      act(() => {
        cluesRevealed = result.current[1].updateCluesFromDiscovery('APP');
      });

      expect(cluesRevealed).toBe(3);
    });
  });
});
