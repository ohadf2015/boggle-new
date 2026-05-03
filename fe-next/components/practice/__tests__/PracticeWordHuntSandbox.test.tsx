/**
 * PracticeWordHuntSandbox — bespoke practice surface, NOT the survival engine.
 * Single target word, tap-to-guess, Wordle-style green/yellow/grey feedback,
 * no life drain, no clue monetization, no leaderboard.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

describe('PracticeWordHuntSandbox', () => {
  it('renders the target word with hidden letters and a tile pool', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-target')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^practice-letter-/).length).toBeGreaterThan(0);
  });

  it('does NOT render any survival HUD chrome (life bar, attempts, clues)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.queryByTestId('survival-life-bar')).toBeNull();
    expect(screen.queryByTestId('clue-shop')).toBeNull();
    expect(screen.queryByTestId('attempts-row')).toBeNull();
  });

  it('always renders the chain CTA so the player can move on at any time', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
  });

  it('accumulates tapped letters into the current guess', () => {
    render(<PracticeWordHuntSandbox />);
    const letters = screen.getAllByTestId(/^practice-letter-/);
    fireEvent.click(letters[0]);
    fireEvent.click(letters[1]);
    expect(screen.getByTestId('practice-current-guess').textContent?.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the instruction line so first-time players know what to do', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByText('practice.wordHunt.instruction')).toBeInTheDocument();
  });
});
