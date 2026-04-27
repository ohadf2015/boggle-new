/**
 * Tests for `allPositionsRevealed` detection in useSurvivalClues.
 *
 * The flag is true when every target position has a green clue from gameplay
 * (target-feedback or word discovery). It used to trigger an auto-win, but
 * that progression was removed — the player must now submit the target word
 * on the board themselves. The detection itself is still useful for UI cues,
 * so these tests stay.
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

    // Bug regression: a board word LONGER than the target whose first N letters happen
    // to match the target was incorrectly marking all target positions green and
    // auto-winning, exposing the answer before the player submitted the full word.
    // Discovered words longer than the target must NOT contribute positional clues.
    it('should NOT auto-reveal when discovered word is LONGER than target but shares prefix', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAT',
          clueContainerRef: createRef(),
        })
      );

      // Player finds "CATS" on the board. Target is "CAT". The first 3 letters
      // of "CATS" align with all 3 letters of "CAT", but "CATS" is NOT the target
      // and the player has not submitted the target word. Reveal must be suppressed.
      act(() => {
        result.current[1].updateCluesFromDiscovery('CATS');
      });

      expect(result.current[0].allPositionsRevealed).toBe(false);
    });

    it('should NOT add positional clues from a discovered word longer than target', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAR',
          clueContainerRef: createRef(),
        })
      );

      // "CARGO" starts with "CAR" but is longer. No positional greens should be added.
      act(() => {
        result.current[1].updateCluesFromDiscovery('CARGO');
      });

      const clues = result.current[0].accumulatedClues;
      expect(clues.size).toBe(0);
    });

    it('should still update knownLetters from a longer discovered word (letters exist, positions unknown)', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAR',
          clueContainerRef: createRef(),
        })
      );

      act(() => {
        result.current[1].updateCluesFromDiscovery('CARGO');
      });

      // Letters present in target should still flow into knownLetters
      // so the player gets a hint that those letters exist somewhere.
      expect(result.current[0].knownLetters.has('C')).toBe(true);
      expect(result.current[0].knownLetters.has('A')).toBe(true);
      expect(result.current[0].knownLetters.has('R')).toBe(true);
      // No positional reveal
      expect(result.current[0].allPositionsRevealed).toBe(false);
    });

    it('should return 0 clues revealed for a word longer than target', () => {
      const { result } = renderHook(() =>
        useSurvivalClues({
          targetWord: 'CAT',
          clueContainerRef: createRef(),
        })
      );

      let cluesRevealed = -1;
      act(() => {
        cluesRevealed = result.current[1].updateCluesFromDiscovery('CATS');
      });

      expect(cluesRevealed).toBe(0);
    });
  });
});
