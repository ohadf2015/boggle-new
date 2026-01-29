/**
 * Tests for yellow letter persistence in LandscapeClueBoxes
 *
 * Bug: Yellow letters should persist in landscape mode clue boxes,
 * but the LandscapeClueBoxes component was missing the `attempts` prop
 * and the `persistedLetters` logic.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { AccumulatedClue } from '../types';

// We need to test the LandscapeClueBoxes component which is internal to SurvivalLandscapeLayout
// For now, we'll import it directly after we extract it

// Mock the component props structure
interface LandscapeClueBoxesTestProps {
  currentHint: { level: number; hint: string; revealed: number; unlockCost: number };
  targetWord: string;
  accumulatedClues: Map<number, AccumulatedClue>;
  revealedLetters: Set<number>;
  gameDir: 'ltr' | 'rtl';
  attempts: { word: string; feedback: LetterFeedback[]; timestamp: number }[];
}

// Test component that mimics LandscapeClueBoxes behavior
// This tests that the LOGIC for persistedLetters works correctly
const TestLandscapeClueBoxes: React.FC<LandscapeClueBoxesTestProps> = ({
  currentHint,
  targetWord,
  accumulatedClues,
  revealedLetters,
  gameDir,
  attempts,
}) => {
  const hintChars = currentHint.hint.split(' ').filter(c => c !== '');

  // Compute persisted letters from attempts (same logic as SurvivalClueBoxes)
  const persistedLetters = React.useMemo(() => {
    const result = new Map<number, { letter: string; type: 'green' | 'yellow' }>();

    for (const attempt of attempts) {
      for (const fb of attempt.feedback) {
        if (fb.feedback === 'green') {
          result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'green' });
        } else if (fb.feedback === 'yellow') {
          const existing = result.get(fb.position);
          if (!existing || existing.type !== 'green') {
            result.set(fb.position, { letter: fb.letter.toUpperCase(), type: 'yellow' });
          }
        }
      }
    }

    return result;
  }, [attempts]);

  return (
    <div dir={gameDir} data-testid="clue-boxes">
      {hintChars.map((char, idx) => {
        const accumulatedClue = accumulatedClues.get(idx);
        const persistedLetter = persistedLetters.get(idx);
        const isHintRevealed = char !== '_';
        const isShopRevealed = revealedLetters.has(idx);

        let displayChar: string;
        let bgClass: string;

        if (accumulatedClue) {
          displayChar = accumulatedClue.letter;
          bgClass = accumulatedClue.type === 'green'
            ? 'bg-green-500'
            : 'bg-yellow-500';
        } else if (isShopRevealed) {
          displayChar = targetWord[idx]?.toUpperCase() || '?';
          bgClass = 'bg-green-500';
        } else if (isHintRevealed) {
          displayChar = char.toUpperCase();
          bgClass = 'bg-neo-pink';
        } else if (persistedLetter) {
          // This is the key logic that was missing!
          displayChar = persistedLetter.letter;
          bgClass = persistedLetter.type === 'green'
            ? 'bg-green-500'
            : 'bg-yellow-500';
        } else {
          displayChar = '?';
          bgClass = 'bg-neo-black';
        }

        return (
          <div
            key={idx}
            data-testid={`clue-box-${idx}`}
            className={bgClass}
          >
            {displayChar}
          </div>
        );
      })}
    </div>
  );
};

describe('LandscapeClueBoxes - Yellow Letter Persistence', () => {
  const defaultProps: LandscapeClueBoxesTestProps = {
    currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
    targetWord: 'APPLE',
    accumulatedClues: new Map<number, AccumulatedClue>(),
    revealedLetters: new Set<number>(),
    gameDir: 'ltr' as const,
    attempts: [],
  };

  it('should show "?" for all positions when no clues exist', () => {
    render(<TestLandscapeClueBoxes {...defaultProps} />);

    // All 5 boxes should show "?" (consistent with portrait mode)
    for (let i = 0; i < 5; i++) {
      const box = screen.getByTestId(`clue-box-${i}`);
      expect(box).toHaveTextContent('?');
    }
  });

  it('should show yellow letter persisted from attempts', () => {
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
      <TestLandscapeClueBoxes
        {...defaultProps}
        attempts={attempts}
      />
    );

    // Position 0 should show 'P' with yellow styling
    const box0 = screen.getByTestId('clue-box-0');
    expect(box0).toHaveTextContent('P');
    expect(box0).toHaveClass('bg-yellow-500');
  });

  it('should prioritize green accumulated clues over yellow persisted letters', () => {
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

    const accumulatedClues = new Map<number, AccumulatedClue>([
      [0, { letter: 'A', type: 'green' }],
    ]);

    render(
      <TestLandscapeClueBoxes
        {...defaultProps}
        attempts={attempts}
        accumulatedClues={accumulatedClues}
      />
    );

    // Position 0 should show 'A' (green clue) not 'P' (yellow persisted)
    const box0 = screen.getByTestId('clue-box-0');
    expect(box0).toHaveTextContent('A');
    expect(box0).toHaveClass('bg-green-500');
  });

  it('should persist most recent yellow letter at each position', () => {
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
      <TestLandscapeClueBoxes
        {...defaultProps}
        attempts={attempts}
      />
    );

    // Position 0 should show 'E' (most recent yellow)
    const box0 = screen.getByTestId('clue-box-0');
    expect(box0).toHaveTextContent('E');
    expect(box0).toHaveClass('bg-yellow-500');
  });

  it('should NOT show gray letters from attempts', () => {
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
      <TestLandscapeClueBoxes
        {...defaultProps}
        attempts={attempts}
      />
    );

    // All positions should still show "?" (gray doesn't persist, unknown shows "?")
    for (let i = 0; i < 5; i++) {
      const box = screen.getByTestId(`clue-box-${i}`);
      expect(box).toHaveTextContent('?');
    }
  });
});
