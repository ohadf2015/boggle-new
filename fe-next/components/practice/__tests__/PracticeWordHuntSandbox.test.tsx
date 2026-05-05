/**
 * Redesigned PracticeWordHuntSandbox — mirrors real word-hunt: 4×4 grid +
 * drag-to-spell + target word panel above. Wordle-style position feedback
 * lights up when the spelled word matches the target length. No survival HUD,
 * no submit/reset buttons (drag-release auto-submits, pointer-down auto-clears).
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

  it('renders a 4×4 grid (16 tiles)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getAllByTestId(/^practice-tile-/)).toHaveLength(16);
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

  it('drag of a non-target word invokes the validator', async () => {
    // Spell "STA" (3 letters) — NOT the EN target "STAR", so validator runs
    render(<PracticeWordHuntSandbox />);
    fireEvent.pointerDown(screen.getByTestId('practice-tile-0-0'));
    fireEvent.pointerEnter(screen.getByTestId('practice-tile-0-1'));
    fireEvent.pointerEnter(screen.getByTestId('practice-tile-0-2'));
    fireEvent.pointerUp(screen.getByTestId('practice-tile-0-2'));
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });
});
