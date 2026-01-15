/**
 * Tests for auto-win behavior when player discovers all green clues
 *
 * Bug fix: When the player discovers all letters of the target word through
 * gameplay (guessing and word discovery), the game should automatically
 * transition to the win state since the player already knows the word.
 *
 * This is separate from the hint system which never reveals the final letter.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSurvivalClues } from '../useSurvivalClues';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

describe('Auto-win when all greens discovered', () => {
  const createRef = () => ({ current: null });

  describe('useSurvivalClues - allPositionsRevealed detection', () => {
    it('should detect when all positions have green clues from feedback', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAT',
          clueContainerRef: createRef(),
        })
      );

      // Player guesses "CAT" - all letters are green
      const feedback: LetterFeedback[] = [
        { letter: 'C', position: 0, feedback: 'green' },
        { letter: 'A', position: 1, feedback: 'green' },
        { letter: 'T', position: 2, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // All 3 positions should have green clues
      const clues = result.current[0].accumulatedClues;
      expect(clues.size).toBe(3);
      expect(clues.get(0)?.type).toBe('green');
      expect(clues.get(1)?.type).toBe('green');
      expect(clues.get(2)?.type).toBe('green');

      // Check if all positions are revealed
      const allRevealed = result.current[0].allPositionsRevealed;
      expect(allRevealed).toBe(true);
    });

    it('should detect when all positions have green clues from word discovery', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAT',
          clueContainerRef: createRef(),
        })
      );

      // Player discovers "CAT" as a word on the board
      act(() => {
        result.current[1].updateCluesFromDiscovery('CAT');
      });

      // All 3 positions should have green clues
      const clues = result.current[0].accumulatedClues;
      expect(clues.size).toBe(3);
      expect(clues.get(0)?.type).toBe('green');
      expect(clues.get(1)?.type).toBe('green');
      expect(clues.get(2)?.type).toBe('green');

      // Check if all positions are revealed
      const allRevealed = result.current[0].allPositionsRevealed;
      expect(allRevealed).toBe(true);
    });

    it('should NOT report allPositionsRevealed when only some positions are green', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // Player discovers "APP" - only first 3 positions
      act(() => {
        result.current[1].updateCluesFromDiscovery('APP');
      });

      const clues = result.current[0].accumulatedClues;
      expect(clues.size).toBe(3);

      // Not all positions revealed (APPLE has 5 letters)
      const allRevealed = result.current[0].allPositionsRevealed;
      expect(allRevealed).toBe(false);
    });

    it('should report allPositionsRevealed after multiple discoveries cover all positions', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'APPLE',
          clueContainerRef: createRef(),
        })
      );

      // First discovery: APP (positions 0, 1, 2)
      act(() => {
        result.current[1].updateCluesFromDiscovery('APP');
      });
      expect(result.current[0].allPositionsRevealed).toBe(false);

      // Second discovery: Through feedback with positions 3 and 4
      const feedback: LetterFeedback[] = [
        { letter: 'X', position: 0, feedback: 'gray' },
        { letter: 'X', position: 1, feedback: 'gray' },
        { letter: 'X', position: 2, feedback: 'gray' },
        { letter: 'L', position: 3, feedback: 'green' },
        { letter: 'E', position: 4, feedback: 'green' },
      ];

      act(() => {
        result.current[1].updateCluesFromFeedback(feedback, [{ feedback }]);
      });

      // Now all 5 positions should be revealed
      expect(result.current[0].allPositionsRevealed).toBe(true);
    });
  });
});
