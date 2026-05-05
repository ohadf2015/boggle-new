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

import PracticeClassicSandbox from '../PracticeClassicSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeClassicSandbox redesigned', () => {
  it('renders 16 tiles', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getAllByTestId(/^practice-tile-/)).toHaveLength(16);
  });

  it('does NOT render a submit button (drag-release auto-submits)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.classic.submit' })).toBeNull();
  });

  it('does NOT render a reset button (auto-clear on next drag)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.classic.reset' })).toBeNull();
  });

  it('does NOT render the rotating PracticeCoachTip', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-coach-tip')).toBeNull();
  });

  it('does NOT render the long instruction paragraph', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByText('practice.classic.instruction')).toBeNull();
  });

  it('renders a goal indicator pill (0/3)', () => {
    render(<PracticeClassicSandbox />);
    const pill = screen.getByTestId('practice-goal-indicator');
    expect(pill).toHaveTextContent('0');
    expect(pill).toHaveTextContent('3');
  });

  it('drag-then-pointerup auto-submits via the validator', async () => {
    render(<PracticeClassicSandbox />);
    const tiles = screen.getAllByTestId(/^practice-tile-/);
    fireEvent.pointerDown(tiles[0]);
    fireEvent.pointerEnter(tiles[1]);
    fireEvent.pointerEnter(tiles[2]);
    fireEvent.pointerUp(tiles[2]);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });

  it('chain CTA hidden until goal reached', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });
});
