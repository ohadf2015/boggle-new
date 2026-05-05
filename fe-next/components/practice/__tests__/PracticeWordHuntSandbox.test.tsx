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
    init = vi.fn().mockResolvedValue(undefined);
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

  it('does NOT render the rotating PracticeCoachTip', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
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
});
