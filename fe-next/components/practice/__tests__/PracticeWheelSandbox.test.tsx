/**
 * PracticeWheelSandbox — bespoke wheel-style practice surface, NOT the
 * WordWheelGame engine. 5-letter wheel, tap to build, no countdown, no
 * combo, no rivals, no leaderboard. Center letter required. Validation
 * uses the real client-side dictionary cache, mocked here.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: true }),
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';

describe('PracticeWheelSandbox', () => {
  it('renders one center letter and five outer letters (6 total)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-wheel-center')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^practice-wheel-outer-/)).toHaveLength(5);
  });

  it('does NOT render any wheel-rush competitive chrome (timer, combo, rivals)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('combo-slot')).toBeNull();
    expect(screen.queryByTestId('timer-bar')).toBeNull();
    expect(screen.queryByTestId('rival-bar')).toBeNull();
  });

  it('accumulates tapped wheel letters into the current word', () => {
    render(<PracticeWheelSandbox />);
    fireEvent.click(screen.getByTestId('practice-wheel-center'));
    fireEvent.click(screen.getByTestId('practice-wheel-outer-0'));
    expect(screen.getByTestId('practice-current-word').textContent?.length).toBe(2);
  });

  it('renders a single short instruction line so first-time players know the rule', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByText('practice.wheelRush.instructionShort')).toBeInTheDocument();
  });
});
