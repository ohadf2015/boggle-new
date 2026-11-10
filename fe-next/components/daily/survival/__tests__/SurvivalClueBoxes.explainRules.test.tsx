/**
 * The daily Word Hunt names its goal and its one rule on the clue panel, in space the panel
 * already reserves: new players could not tell what the "?" boxes were for, or that a word
 * of that length spends a try.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';
import type { AccumulatedClue, TargetAttempt } from '../types';

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, ...domProps } = props;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const baseProps = {
  currentHint: { level: 0, hint: '_ _ _ _ _', revealed: 0, unlockCost: 0 },
  targetWord: 'PLANE',
  attempts: [] as TargetAttempt[],
  accumulatedClues: new Map<number, AccumulatedClue>(),
  revealedLetters: new Set<number>(),
  knownLetters: new Set<string>(),
  latestAttemptFeedback: null,
  showFeedbackOverlay: false,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t,
};

describe('SurvivalClueBoxes - explainRules', () => {
  it('Given a fresh daily run, Then the tries row names the goal, the word length and the tries', () => {
    render(<SurvivalClueBoxes {...baseProps} explainRules />);
    expect(screen.getByTestId('hunt-goal').textContent).toBe('wordHunt.survival.goal:{"count":5,"tries":10}');
    expect(screen.queryByText(/wordHunt.survival.triesLeft/)).toBeNull();
  });

  it('Given no clue yet, Then it says short words are free and full-length words are guesses', () => {
    render(<SurvivalClueBoxes {...baseProps} explainRules />);
    expect(screen.getByTestId('clue-empty-cue').textContent).toContain('wordHunt.survival.cueShortVsGuess:{"count":5}');
  });

  it('Given a word of the hidden length is being traced, Then the warning shows beside the goal', () => {
    render(<SurvivalClueBoxes {...baseProps} explainRules matchesTargetLength />);
    expect(screen.getByTestId('hunt-goal')).toBeInTheDocument();
    expect(screen.getByTestId('match-target-warning')).toBeInTheDocument();
  });

  it('Given the first guess is made, Then the row goes back to counting tries', () => {
    const attempts = [{ word: 'CRANE', feedback: [], timestamp: 1 }] as unknown as TargetAttempt[];
    render(<SurvivalClueBoxes {...baseProps} attempts={attempts} explainRules />);
    expect(screen.queryByTestId('hunt-goal')).toBeNull();
    expect(screen.getByText(/9\/10/)).toBeInTheDocument();
  });

  it('leaves multiplayer copy alone when the rules are not asked for', () => {
    render(<SurvivalClueBoxes {...baseProps} />);
    expect(screen.queryByTestId('hunt-goal')).toBeNull();
    expect(screen.getByTestId('clue-empty-cue').textContent).toContain('wordHunt.survival.findWordsToReveal');
  });
});
