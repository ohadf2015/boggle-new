/**
 * PracticeWordHuntSandbox — uses real <GridComponent> for the 4×4 board.
 * Practice-only chrome adds the target panel + bonus discoveries list.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    screen = { width: 320, height: 240 };
    stage = { addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));
vi.mock('@/components/GridComponent', () => ({
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component-stub">
      <button
        type="button"
        data-testid="stub-submit-word"
        onClick={(e) => onWordSubmit?.((e.currentTarget as HTMLButtonElement).dataset.word ?? '')}
      />
      <div data-row="0" data-col="0" />
    </div>
  ),
}));

vi.mock('@/lib/practice/wordHuntPuzzle', () => ({
  generateWordHuntPuzzle: () => ({
    board: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
    target: 'STAR',
  }),
  getWordHuntTargets: () => ['STAR'],
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox redesigned', () => {
  it('renders the target word panel', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-target')).toBeInTheDocument();
  });

  it('renders the real GridComponent (via stub)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('grid-component-stub')).toBeInTheDocument();
  });

  it('does NOT render submit or reset buttons', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.wordHunt.submit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'practice.wordHunt.backspace' })).toBeNull();
  });

  it('renders the inline PracticeCoachTip so the player learns by doing', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-coach-tip')).toBeInTheDocument();
  });

  it('does NOT render survival HUD (life bar, clue shop)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('survival-life-bar')).toBeNull();
    expect(screen.queryByTestId('clue-shop')).toBeNull();
  });

  it('chain CTA hidden until target solved', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });

  it('non-target word goes through validator', async () => {
    render(<PracticeWordHuntSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'NIT');
    fireEvent.click(btn);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledWith('NIT'));
  });

  it('renders an always-visible bailout CTA pointing at the live mode (regression: was previously hidden after solve)', async () => {
    render(<PracticeWordHuntSandbox />);

    // Pre-solve: bailout visible.
    const cta = screen.getByTestId('practice-bailout-cta');
    expect(cta).toBeInTheDocument();
    expect(cta.getAttribute('href')).toBe('/en/daily/word-hunt');

    // Solve the target — STAR is the EN sandbox target.
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'STAR');
    fireEvent.click(btn);

    // Post-solve: bailout STILL visible (the bug was that this disappeared,
    // leaving the player without an obvious way to leave practice).
    await waitFor(() => {
      expect(screen.getByTestId('practice-bailout-cta')).toBeInTheDocument();
    });
  });
});

describe('PracticeWordHuntSandbox layout', () => {
  it('fills its parent (h-full) instead of hardcoding 100dvh — prevents in-game scroll', () => {
    const { container } = render(<PracticeWordHuntSandbox />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).not.toContain('100dvh');
  });
});
