/**
 * PracticeClassicSandbox is a bespoke practice surface — NOT the real
 * SinglePlayer engine. It uses a tiny curated board, tap-based selection,
 * and exposes only practice-friendly UI: found-words list, coach strip,
 * continue-to-next CTA. No score, no timer, no leaderboard, no monetization.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';

describe('PracticeClassicSandbox', () => {
  it('renders a curated practice board (4x4 = 16 tiles)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getAllByTestId(/^practice-tile-/)).toHaveLength(16);
  });

  it('does NOT render any competitive HUD chrome (score, combo, timer)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('combo-display')).toBeNull();
    expect(screen.queryByTestId('score-display')).toBeNull();
    expect(screen.queryByTestId('timer-bar')).toBeNull();
  });

  it('always renders the chain CTA so the player can continue at any time', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
  });

  it('tracks a tapped tile sequence in the current word readout', () => {
    render(<PracticeClassicSandbox />);
    const tiles = screen.getAllByTestId(/^practice-tile-/);
    fireEvent.click(tiles[0]);
    fireEvent.click(tiles[1]); // adjacent in row 0
    expect(screen.getByTestId('practice-current-word').textContent).toMatch(/^[A-Z]{2}$/);
  });

  it('renders a help/instruction line so first-time players know what to do', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByText('practice.classic.instruction')).toBeInTheDocument();
  });
});
