/**
 * Integration test: finding 3 valid wheel words writes to practice progress
 * AND swaps the action area to the continue CTA. Also asserts the
 * center-letter rule — a word that omits the center letter should NOT count
 * toward the goal. Validation is dictionary-backed; the cache is mocked.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playButtonClickSound: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

const VALID = new Set(['car', 'rat', 'ear', 'are', 'sea', 'set']);
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({
    checkWord: (w: string) => VALID.has(w.toLowerCase()),
    isLoaded: true,
  }),
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

beforeEach(() => {
  window.localStorage.clear();
});

const submit = () =>
  fireEvent.click(screen.getByRole('button', { name: 'practice.wheelRush.submit' }));
const reset = () =>
  fireEvent.click(screen.getByRole('button', { name: 'practice.wheelRush.reset' }));

describe('PracticeWheelSandbox completion integration', () => {
  it('renders the continue CTA after 3 valid words containing the center letter', async () => {
    render(<PracticeWheelSandbox />);

    // EN wheel: center 'A', outer ['T', 'R', 'C', 'E', 'S']
    const center = () => fireEvent.click(screen.getByTestId('practice-wheel-center'));
    const outer = (i: number) => fireEvent.click(screen.getByTestId(`practice-wheel-outer-${i}`));

    // CAR — outer C(idx 2), center A, outer R(idx 1)
    outer(2); center(); outer(1);
    submit();

    // RAT — outer R(idx 1), center A, outer T(idx 0)
    outer(1); center(); outer(0);
    submit();

    // EAR — outer E(idx 3), center A, outer R(idx 1)
    outer(3); center(); outer(1);
    submit();

    await waitFor(() => {
      expect(screen.getByTestId('practice-continue-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(true);
  });

  it('rejects a word that does NOT include the center letter (no progress)', () => {
    render(<PracticeWheelSandbox />);
    // CRT — outer C, R, T, no center letter.
    fireEvent.click(screen.getByTestId('practice-wheel-outer-2'));
    fireEvent.click(screen.getByTestId('practice-wheel-outer-1'));
    fireEvent.click(screen.getByTestId('practice-wheel-outer-0'));
    submit();
    expect(screen.queryByTestId('practice-continue-cta')).toBeNull();
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(false);
    reset();
  });
});
