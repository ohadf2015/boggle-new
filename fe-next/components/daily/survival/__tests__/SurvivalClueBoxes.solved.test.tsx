import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';

const t = (k: string) => k;
const base = {
  currentHint: { hint: '_ _ _ _ _', level: 0 } as never,
  targetWord: 'PLATE',
  attempts: [{ word: 'PLATE', isDiscovery: false, feedback: [] } as never],
  accumulatedClues: new Map(),
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  isClueGaining: false,
  skipAnimations: false,
  gameDir: 'ltr' as const,
  t,
};

describe('SurvivalClueBoxes once the hidden word is solved', () => {
  it('Given a solve, Then the boxes hold the solved word in the solved colour, over the guess feedback', () => {
    render(
      <SurvivalClueBoxes
        {...base}
        solvedWord="PLATE"
        showFeedbackOverlay
        latestAttemptFeedback={Array.from('PLATE').map((letter, position) => ({ letter, position, feedback: 'green' as const }))}
      />,
    );
    const letters = screen.getAllByTestId('hunt-solved-letter');
    expect(letters.map((el) => el.textContent).join('')).toBe('PLATE');
    letters.forEach((el) => expect(el.className).toContain('bg-emerald-400'));
    expect(screen.queryByTestId('clue-box-0')).toBeNull();
  });

  it('Given no solve, Then the ordinary clue boxes show', () => {
    render(<SurvivalClueBoxes {...base} showFeedbackOverlay={false} latestAttemptFeedback={null} />);
    expect(screen.getByTestId('clue-box-0')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-solved-letter')).toBeNull();
  });
});
