/**
 * Redesigned PracticeWheelSandbox — TAP-BASED to mirror real WheelRush.
 * 7 letters (1 center + 6 outer). Real `<WheelLetter>` component reused.
 * Center-letter rule + 3-letter min match real (WordWheelGame.tsx:455–467).
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

import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWheelSandbox redesigned', () => {
  it('renders one center letter and six outer letters (7 total — real WheelRush parity)', () => {
    render(<PracticeWheelSandbox />);
    // WheelLetter buttons expose data-wheel-index 0..6
    for (let i = 0; i <= 6; i += 1) {
      expect(document.querySelector(`[data-wheel-index="${i}"]`)).not.toBeNull();
    }
    expect(document.querySelector('[data-wheel-index="7"]')).toBeNull();
  });

  it('does NOT render a reset button (tap built-tile to remove instead)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.wheelRush.reset' })).toBeNull();
  });

  it('does NOT render the rotating PracticeCoachTip', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
  });

  it('does NOT render competitive chrome (timer, combo, rivals)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('combo-slot')).toBeNull();
    expect(screen.queryByTestId('timer-bar')).toBeNull();
    expect(screen.queryByTestId('rival-bar')).toBeNull();
  });

  it('renders a goal indicator pill (0/3)', () => {
    render(<PracticeWheelSandbox />);
    const pill = screen.getByTestId('practice-goal-indicator');
    expect(pill).toHaveTextContent('0');
    expect(pill).toHaveTextContent('3');
  });

  it('chain CTA hidden until 3 valid words found', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });

  it('submit button hidden until built word reaches 3 letters (real min)', () => {
    render(<PracticeWheelSandbox />);
    // Tap two letters → still hidden
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const outer = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(outer);
    expect(screen.queryByTestId('practice-wheel-submit')).toBeNull();
  });

  it('shows submit button at 3 letters then validates on tap', async () => {
    render(<PracticeWheelSandbox />);
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const o1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    const o2 = document.querySelector('[data-wheel-index="2"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(o1);
    fireEvent.click(o2);
    const submit = screen.getByTestId('practice-wheel-submit');
    fireEvent.click(submit);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });

  it('does NOT call validator if center letter not used', async () => {
    render(<PracticeWheelSandbox />);
    const o1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    const o2 = document.querySelector('[data-wheel-index="2"]') as HTMLElement;
    const o3 = document.querySelector('[data-wheel-index="3"]') as HTMLElement;
    fireEvent.click(o1);
    fireEvent.click(o2);
    fireEvent.click(o3);
    fireEvent.click(screen.getByTestId('practice-wheel-submit'));
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
  });
});
