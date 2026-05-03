/**
 * Integration test: finding 3 valid wheel words writes to practice progress
 * AND mounts the completion banner. Also asserts the center-letter rule —
 * a word that omits the center letter should NOT count toward the goal.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
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
  it('renders the complete banner after 3 valid words containing the center letter', async () => {
    render(<PracticeWheelSandbox />);

    // EN puzzle: center 'A', outer ['T', 'R', 'C', 'E']
    // Valid words tried below: CAR, RAT, EAR — all use the center 'A'.
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
      expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(true);
  });

  it('rejects a word that does NOT include the center letter (no progress)', async () => {
    render(<PracticeWheelSandbox />);
    // CRT — outer C, R, T, no center letter.
    fireEvent.click(screen.getByTestId('practice-wheel-outer-2'));
    fireEvent.click(screen.getByTestId('practice-wheel-outer-1'));
    fireEvent.click(screen.getByTestId('practice-wheel-outer-0'));
    submit();
    expect(screen.queryByTestId('practice-complete-banner')).toBeNull();
    expect(isPracticeModeComplete('wheelRush', 'en')).toBe(false);
    reset();
  });
});
