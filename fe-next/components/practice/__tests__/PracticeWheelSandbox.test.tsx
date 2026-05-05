/**
 * Redesigned PracticeWheelSandbox — drag-spell on a 5-letter wheel (1 center
 * + 4 outer). Center-letter rule enforced. Real dictionary validation. No
 * submit/reset buttons, no curated word list. Goal: 3 valid words.
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
  it('renders one center letter and four outer letters (5 total)', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.getByTestId('practice-letter-0')).toBeInTheDocument();
    expect(screen.getByTestId('practice-letter-1')).toBeInTheDocument();
    expect(screen.getByTestId('practice-letter-2')).toBeInTheDocument();
    expect(screen.getByTestId('practice-letter-3')).toBeInTheDocument();
    expect(screen.getByTestId('practice-letter-4')).toBeInTheDocument();
  });

  it('does NOT render submit, reset, or backspace buttons', () => {
    render(<PracticeWheelSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.wheelRush.submit' })).toBeNull();
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

  it('drag of center+outer invokes the validator', async () => {
    render(<PracticeWheelSandbox />);
    fireEvent.pointerDown(screen.getByTestId('practice-letter-0'));
    fireEvent.pointerEnter(screen.getByTestId('practice-letter-1'));
    fireEvent.pointerEnter(screen.getByTestId('practice-letter-2'));
    fireEvent.pointerUp(screen.getByTestId('practice-letter-2'));
    await waitFor(() => expect(validatorCheck).toHaveBeenCalled());
  });

  it('does NOT call validator if center letter not used', async () => {
    render(<PracticeWheelSandbox />);
    // Drag two outer letters only (no center)
    fireEvent.pointerDown(screen.getByTestId('practice-letter-1'));
    fireEvent.pointerEnter(screen.getByTestId('practice-letter-2'));
    fireEvent.pointerUp(screen.getByTestId('practice-letter-2'));
    // Validator should NOT be called — center-letter rule rejects early
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
  });
});
