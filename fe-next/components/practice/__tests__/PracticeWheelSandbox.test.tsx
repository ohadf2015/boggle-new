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

  it('renders reset + shuffle buttons (real-game parity)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-wheel-reset')).toBeInTheDocument();
    expect(screen.getByTestId('practice-wheel-shuffle')).toBeInTheDocument();
  });

  it('reset clears any built letters', () => {
    render(<PracticeWheelSandbox />);
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const o1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(o1);
    fireEvent.click(screen.getByTestId('practice-wheel-reset'));
    // After reset all wheel letters should be unused (no aria-pressed=true).
    const used = Array.from(document.querySelectorAll('[data-wheel-used="true"]'));
    expect(used.length).toBe(0);
  });

  it('shuffle keeps 7 wheel letters and rerenders the outer ring', () => {
    render(<PracticeWheelSandbox />);
    const before = Array.from(
      document.querySelectorAll('[data-wheel-letter]'),
    ).map((el) => (el as HTMLElement).dataset.wheelLetter);
    expect(before.length).toBe(7);
    fireEvent.click(screen.getByTestId('practice-wheel-shuffle'));
    const after = Array.from(
      document.querySelectorAll('[data-wheel-letter]'),
    ).map((el) => (el as HTMLElement).dataset.wheelLetter);
    expect(after.length).toBe(7);
    // Center never moves; outer 6 are the same set, possibly reordered.
    expect(after[0]).toBe(before[0]);
    expect(new Set(after.slice(1))).toEqual(new Set(before.slice(1)));
  });

  it('renders the inline PracticeCoachTip so the player learns by doing', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-coach-tip')).toBeInTheDocument();
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
