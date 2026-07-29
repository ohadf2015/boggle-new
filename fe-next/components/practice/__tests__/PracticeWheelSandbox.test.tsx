/**
 * PracticeWheelSandbox now renders the REAL WordWheelGame
 * (`components/daily/WordWheelGame.tsx`) in practice + hideCompetitive mode,
 * wrapped in the practice shell (back-to-hub, goal pill, bailout, completion
 * popup). These tests verify the integration — wheel presence, goal chrome,
 * and the suppression of competitive chrome — not WordWheelGame internals
 * (those have their own suite).
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="pixi-ring-stub" />,
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
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
  window.localStorage.clear();
});

describe('PracticeWheelSandbox (real WordWheelGame reuse)', () => {
  it('renders the real wheel — 1 center (-1) + 6 outer (0..5) letters', () => {
    render(<PracticeWheelSandbox />);
    // WordWheelGame convention: center=-1, outer=0..5.
    expect(document.querySelector('[data-wheel-index="-1"]')).not.toBeNull();
    for (let i = 0; i <= 5; i += 1) {
      expect(document.querySelector(`[data-wheel-index="${i}"]`)).not.toBeNull();
    }
    expect(document.querySelector('[data-wheel-index="6"]')).toBeNull();
  });

  it('reuses the live wheel action bar (word-wheel-action-bar)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('word-wheel-action-bar')).toBeInTheDocument();
  });

  it('renders a goal indicator pill (0/3)', () => {
    render(<PracticeWheelSandbox />);
    const pill = screen.getByTestId('practice-goal-indicator');
    expect(pill).toHaveTextContent('0');
    expect(pill).toHaveTextContent('3');
  });

  it('does NOT render competitive chrome (combo, rivals, leaderboard fetch)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('combo-slot')).toBeNull();
    expect(screen.queryByTestId('next-rival-slot')).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders the back-to-hub link', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-back-to-hub')).toBeInTheDocument();
  });

  it('renders the practice bailout CTA', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-bailout-cta')).toBeInTheDocument();
  });

  it('renders the inline PracticeCoachTip so the player learns by doing', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-coach-tip')).toBeInTheDocument();
  });

  it('keeps the chain CTA hidden until the goal is reached', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });

  it('shows the practice "end run" CTA instead of a countdown timer', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByRole('button', { name: /practice\.endRun/i })).toBeInTheDocument();
  });
});

describe('PracticeWheelSandbox layout', () => {
  it('fills its parent (h-full) instead of hardcoding 100dvh — prevents in-game scroll', () => {
    const { container } = render(<PracticeWheelSandbox />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('h-full');
    expect(root.className).not.toContain('100dvh');
  });
});
