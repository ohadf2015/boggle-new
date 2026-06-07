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

  it('renders clear, submit, and backspace buttons (live WordWheelGame parity)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-wheel-reset')).toBeInTheDocument();
    expect(screen.getByTestId('practice-wheel-submit')).toBeInTheDocument();
    expect(screen.getByTestId('practice-wheel-backspace')).toBeInTheDocument();
    // Shuffle was dropped to match the real wheel's control set.
    expect(screen.queryByTestId('practice-wheel-shuffle')).toBeNull();
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

  it('backspace removes only the last built letter', () => {
    render(<PracticeWheelSandbox />);
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const o1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    const o2 = document.querySelector('[data-wheel-index="2"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(o1);
    fireEvent.click(o2);
    expect(document.querySelectorAll('[data-wheel-used="true"]').length).toBe(3);
    fireEvent.click(screen.getByTestId('practice-wheel-backspace'));
    expect(document.querySelectorAll('[data-wheel-used="true"]').length).toBe(2);
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

  it('submit button stays disabled until built word reaches 3 letters (real min)', () => {
    render(<PracticeWheelSandbox />);
    // Always present (live-wheel parity) but disabled below the 3-letter min.
    const submit = screen.getByTestId('practice-wheel-submit');
    expect(submit).toBeDisabled();
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const outer = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(outer);
    expect(submit).toBeDisabled();
  });

  it('enables submit at 3 letters then validates on tap', async () => {
    render(<PracticeWheelSandbox />);
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const o1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    const o2 = document.querySelector('[data-wheel-index="2"]') as HTMLElement;
    fireEvent.click(center);
    fireEvent.click(o1);
    fireEvent.click(o2);
    const submit = screen.getByTestId('practice-wheel-submit');
    expect(submit).toBeEnabled();
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

describe('PracticeWheelSandbox layout', () => {
  it('fills its parent (h-full) instead of hardcoding 100dvh — prevents in-game scroll', () => {
    const { container } = render(<PracticeWheelSandbox />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).not.toContain('100dvh');
  });

  it('centers the wheel cluster vertically (flex-1 + justify-center) so it stays in the middle', () => {
    // Regression guard for the "wheel stuck at the top with a big void below"
    // bug. Mirrors the live WordWheelGame wheel-cluster which absorbs leftover
    // vertical space and centers the wheel + action bar.
    render(<PracticeWheelSandbox />);
    const cluster = screen.getByTestId('wheel-cluster');
    expect(cluster.className).toContain('flex-1');
    expect(cluster.className).toContain('justify-center');
  });
});
