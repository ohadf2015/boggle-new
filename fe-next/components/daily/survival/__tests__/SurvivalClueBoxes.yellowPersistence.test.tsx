/**
 * Tests for yellow letter persistence in SurvivalClueBoxes
 *
 * Bug: Yellow letters should persist in the clue boxes after feedback overlay
 * dismisses, showing what the user guessed at each position (until a green
 * clue replaces it).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

describe('SurvivalClueBoxes - Yellow Letter Persistence', () => {
  const defaultProps = {
    currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
    targetWord: 'APPLE',
    attempts: [],
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    knownLetters: new Set<string>(),
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,
    isClueGaining: false,
    isProtected: false,
    skipAnimations: true,
    gameDir: 'ltr' as const,
    t: (key: string) => key,
  };

  it('should show "?" for all positions when no clues exist', () => {
    render(<SurvivalClueBoxes {...defaultProps} />);

    // All 5 boxes should show "?"
    const boxes = screen.getAllByText('?');
    expect(boxes).toHaveLength(5);
  });

  it('should show green clue letter when position has green clue', () => {
    const accumulatedClues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }],
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        accumulatedClues={accumulatedClues}
      />
    );

    // Position 0 should show 'A'
    expect(screen.getByText('A')).toBeInTheDocument();
    // Other 4 positions should show "?"
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(4);
  });

  it('should show yellow letter in box after feedback overlay dismisses when no better clue exists', () => {
    // User guessed "PXXXX" and got yellow P at position 0
    // After overlay dismisses, position 0 should still show "P" in yellow
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
        timestamp: Date.now(),
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        showFeedbackOverlay={false} // Overlay has dismissed
      />
    );

    // Position 0 should show the yellow letter 'P' (persisted from attempt)
    expect(screen.getByText('P')).toBeInTheDocument();
  });

  it('should replace yellow with green when green clue is found at same position', () => {
    // User guessed "PXXXX" (yellow P at 0), then guessed "APPLE" (green A at 0)
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
        timestamp: Date.now() - 1000,
      },
    ];

    const accumulatedClues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }],
    ]);

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
        showFeedbackOverlay={false}
      />
    );

    // Position 0 should show 'A' (green takes priority over yellow)
    expect(screen.getByText('A')).toBeInTheDocument();
    // Yellow 'P' should NOT be shown since green 'A' replaced it
    expect(screen.queryByText('P')).not.toBeInTheDocument();
  });

  it('should persist most recent yellow/green letter at each position', () => {
    // User made multiple attempts with different letters at position 0
    // First: yellow P, then: yellow E
    // Should show the MOST RECENT non-gray feedback
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
        word: 'EXXXX',
        feedback: [
          { letter: 'E', position: 0, feedback: 'yellow' as const },
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
        ],
        timestamp: Date.now() - 1000,
      },
    ];

    render(
      <SurvivalClueBoxes
        {...defaultProps}
        attempts={attempts}
        showFeedbackOverlay={false}
      />
    );

    // Position 0 should show 'E' (most recent yellow)
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('should NOT show gray letters from previous attempts', () => {
    // User guessed "XXXXX" - all gray
    // After overlay dismisses, positions should still show "?"
    const attempts = [
      {
        word: 'XXXXX',
        feedback: [
          { letter: 'X', position: 0, feedback: 'gray' as const },
          { letter: 'X', position: 1, feedback: 'gray' as const },
          { letter: 'X', position: 2, feedback: 'gray' as const },
          { letter: 'X', position: 3, feedback: 'gray' as const },
          { letter: 'X', position: 4, feedback: 'gray' as const },
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

    // All positions should show "?" (gray doesn't persist)
    const questionMarks = screen.getAllByText('?');
    expect(questionMarks).toHaveLength(5);
  });

  it('should show yellow box with correct styling for persisted yellow letters', () => {
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

    // The yellow letter should have yellow background styling
    const yellowBox = screen.getByText('P').closest('div');
    expect(yellowBox).toHaveClass('bg-yellow-500');
  });
});
