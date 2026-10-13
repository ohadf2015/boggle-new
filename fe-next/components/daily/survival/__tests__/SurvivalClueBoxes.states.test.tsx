import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SurvivalClueBoxes } from '../SurvivalClueBoxes';

const t = (k: string) => k;
const base = {
  currentHint: { hint: '_ _ _ _ _', level: 0 } as never,
  targetWord: 'ABCDE',
  revealedLetters: new Set<number>(),
  latestAttemptFeedback: null,
  showFeedbackOverlay: false,
  isClueGaining: false,
  skipAnimations: true,
  gameDir: 'ltr' as const,
  t,
};

describe('SurvivalClueBoxes clue states', () => {
  it('gives correct, wrong-place and unknown slots distinct states and colors, with a legend', () => {
    render(
      <SurvivalClueBoxes
        {...base}
        attempts={[{ word: 'AXXXB', isDiscovery: false, feedback: [] } as never]}
        accumulatedClues={new Map([[0, { letter: 'A', type: 'green' }], [1, { letter: 'B', type: 'yellow' }]]) as never}
        knownLetters={new Set(['B'])}
      />,
    );
    const g = screen.getByTestId('clue-box-0');
    const y = screen.getByTestId('clue-box-1');
    const u = screen.getByTestId('clue-box-4');
    expect(g.dataset.state).toBe('green');
    expect(y.dataset.state).toBe('yellow');
    expect(u.dataset.state).toBe('unknown');
    expect(g.className).toMatch(/bg-emerald-500/);
    expect(y.className).toMatch(/bg-amber-400/);
    expect(u.className).toMatch(/bg-neo-black/);
    expect(screen.getByTestId('clue-legend')).toBeTruthy();
  });

  it('keeps phone-size tiles finger readable (not the 24px cramped tiles)', () => {
    render(<SurvivalClueBoxes {...base} attempts={[]} accumulatedClues={new Map()} knownLetters={new Set()} />);
    expect(screen.getByTestId('clue-box-0').className).toMatch(/cramped:w-10/);
  });
});
