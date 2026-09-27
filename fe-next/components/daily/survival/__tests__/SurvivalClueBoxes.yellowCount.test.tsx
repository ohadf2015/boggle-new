/**
 * Tests for yellow letter count limiting in SurvivalClueBoxes
 *
 * Bug fix: Orange (yellow) letters should not appear more times in hint boxes
 * than they exist in the target word.
 *
 * Example: If target is "CAT" (one 'A'), guessing "AAA" should show at most
 * one yellow 'A', not three.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue } from '../types';

describe('SurvivalClueBoxes - Yellow Letter Count Limiting', () => {
  const defaultProps = {
    currentHint: { level: 0, hint: '_ _ _', unlockCost: 0 },
    targetWord: 'CAT',
    attempts: [],
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,
    isClueGaining: false,
    skipAnimations: true,
    gameDir: 'ltr' as const,
    t: (key: string) => key,
  };

  it('should limit yellow letters to target word frequency - single occurrence', () => {
    // Target: "CAT" (one 'A')
    // Guess: "AAA" → position 0: yellow A, position 1: green A, position 2: yellow A
    // But "CAT" only has ONE 'A', so we should show at most 1 yellow
    // Actually with a green at position 1, there should be ZERO yellows
    const attempts = [
      {
        word: 'AAA',
        feedback: [
          { letter: 'A', position: 0, feedback: 'yellow' as const }, // A exists but not here
          { letter: 'A', position: 1, feedback: 'green' as const },  // A is at position 1
          { letter: 'A', position: 2, feedback: 'yellow' as const }, // A exists but not here
        ],
        timestamp: Date.now(),
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        showFeedbackOverlay={false}
      />
    );

    // Count how many 'A' letters are displayed
    const allAs = screen.getAllByText('A');
    // Should show at most 1 'A' (the green one), since target only has 1 'A'
    // and we already found it as green
    expect(allAs.length).toBe(1);

    // The green A should be at position 1 with green styling
    const greenBox = allAs[0].closest('div');
    expect(greenBox).toHaveClass('bg-neo-lime');
  });

  it('should show yellows only up to remaining occurrences after greens', () => {
    // Target: "APPLE" (two 'P's at positions 1 and 2)
    // Guess: "PPPPP" → various feedback
    // If 1 P is green, only 1 more P can be yellow
    const attempts = [
      {
        word: 'PPPPP',
        feedback: [
          { letter: 'P', position: 0, feedback: 'yellow' as const }, // P exists but not here
          { letter: 'P', position: 1, feedback: 'green' as const },  // P is at position 1
          { letter: 'P', position: 2, feedback: 'green' as const },  // P is at position 2
          { letter: 'P', position: 3, feedback: 'yellow' as const }, // Would be yellow but all Ps found
          { letter: 'P', position: 4, feedback: 'yellow' as const }, // Would be yellow but all Ps found
        ],
        timestamp: Date.now(),
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        targetWord="APPLE"
        currentHint={{ level: 0, hint: '_ _ _ _ _', unlockCost: 0 }}
        attempts={attempts}
        showFeedbackOverlay={false}
      />
    );

    // Count 'P' letters - should be at most 2 (the target has 2 Ps)
    const allPs = screen.getAllByText('P');
    expect(allPs.length).toBeLessThanOrEqual(2);

    // Count yellow boxes - should be 0 since both Ps are green
    const yellowBoxes = allPs.filter(el => el.closest('div')?.classList.contains('bg-neo-yellow'));
    expect(yellowBoxes.length).toBe(0);
  });

  it('should allow yellows for remaining occurrences when not all are green', () => {
    // Target: "APPLE" (two 'P's at positions 1 and 2)
    // Only position 1 has green P, so position 0 can have yellow P
    const attempts = [
      {
        word: 'PXXXX',
        feedback: [
          { letter: 'P', position: 0, feedback: 'yellow' as const }, // P exists, 1 of 2
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    const accumulatedClues = new Map<number, AccumulatedClue>([
      [1, { letter: 'P', type: 'green' }], // One P found as green
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        targetWord="APPLE"
        currentHint={{ level: 0, hint: '_ _ _ _ _', unlockCost: 0 }}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        showFeedbackOverlay={false}
      />
    );

    // Should show 2 Ps total: 1 green (accumulated) + 1 yellow (persisted)
    const allPs = screen.getAllByText('P');
    expect(allPs.length).toBe(2);

    // Count by color
    const greenPs = allPs.filter(el => el.closest('div')?.classList.contains('bg-neo-lime'));
    const yellowPs = allPs.filter(el => el.closest('div')?.classList.contains('bg-neo-yellow'));

    expect(greenPs.length).toBe(1);
    expect(yellowPs.length).toBe(1);
  });

  it('should not show any yellows when all occurrences are found as green', () => {
    // Target: "APPLE" (one 'A' at position 0, one 'E' at position 4)
    // Both A and E found as green - no yellows should show
    const attempts = [
      {
        word: 'AEXXX',
        feedback: [
          { letter: 'A', position: 0, feedback: 'yellow' as const }, // Would be yellow but...
          { letter: 'E', position: 1, feedback: 'yellow' as const }, // E exists but not here
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now(),
      },
    ];

    const accumulatedClues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }], // A found at its position
      [4, { letter: 'E', type: 'green' }], // E found at its position
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        targetWord="APPLE"
        currentHint={{ level: 0, hint: '_ _ _ _ _', unlockCost: 0 }}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        showFeedbackOverlay={false}
      />
    );

    // Should show A and E as green only (no yellows)
    const greenA = screen.getByText('A').closest('div');
    const greenE = screen.getByText('E').closest('div');

    expect(greenA).toHaveClass('bg-neo-lime');
    expect(greenE).toHaveClass('bg-neo-lime');

    // No yellow boxes should exist for A or E
    const allBoxes = screen.getAllByText(/[AE]/).map(el => el.closest('div'));
    const yellowBoxes = allBoxes.filter(box => box?.classList.contains('bg-neo-yellow'));
    expect(yellowBoxes.length).toBe(0);
  });

  it('should handle letters with multiple occurrences correctly', () => {
    // Target: "BANANA" (3 'A's at positions 1, 3, 5 and 2 'N's at positions 2, 4)
    // This tests proper counting with multiple duplicate letters
    const attempts = [
      {
        word: 'AAAAAA', // All As
        feedback: [
          { letter: 'A', position: 0, feedback: 'yellow' as const },
          { letter: 'A', position: 1, feedback: 'green' as const },
          { letter: 'A', position: 2, feedback: 'yellow' as const },
          { letter: 'A', position: 3, feedback: 'green' as const },
          { letter: 'A', position: 4, feedback: 'yellow' as const },
          { letter: 'A', position: 5, feedback: 'green' as const },
        ],
        timestamp: Date.now(),
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        targetWord="BANANA"
        currentHint={{ level: 0, hint: '_ _ _ _ _ _', unlockCost: 0 }}
        attempts={attempts}
        showFeedbackOverlay={false}
      />
    );

    // Should show exactly 3 'A's (target has 3)
    const allAs = screen.getAllByText('A');
    expect(allAs.length).toBe(3);

    // All 3 should be green (they're at the correct positions)
    const greenAs = allAs.filter(el => el.closest('div')?.classList.contains('bg-neo-lime'));
    expect(greenAs.length).toBe(3);

    // No yellow As (all 3 target As are found as green)
    const yellowAs = allAs.filter(el => el.closest('div')?.classList.contains('bg-neo-yellow'));
    expect(yellowAs.length).toBe(0);
  });

  it('should handle multiple attempts correctly accumulating yellows', () => {
    // Multiple attempts, each adding yellows for different letters
    // Target: "APPLE"
    const attempts = [
      {
        word: 'PXXXX',
        feedback: [
          { letter: 'P', position: 0, feedback: 'yellow' as const },
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 2000,
      },
      {
        word: 'XXXPX',
        feedback: [
          { letter: 'X', position: 0, feedback: 'gray' as const },
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'P', position: 3, feedback: 'yellow' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        targetWord="APPLE"
        currentHint={{ level: 0, hint: '_ _ _ _ _', unlockCost: 0 }}
        attempts={attempts}
        showFeedbackOverlay={false}
      />
    );

    // APPLE has 2 Ps, so we can show at most 2 yellow Ps
    const allPs = screen.getAllByText('P');
    expect(allPs.length).toBeLessThanOrEqual(2);
  });
});
