/**
 * PracticeWordHuntSandbox — loading state during word verification
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
vi.mock('@/components/GridComponent', () => ({
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component-stub">
      <button
        type="button"
        data-testid="stub-submit-word"
        onClick={(e) => onWordSubmit?.((e.currentTarget as HTMLButtonElement).dataset.word ?? '')}
      />
      <div data-row="0" data-col="0" />
    </div>
  ),
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve({ isValid: true, source: 'dictionary' }), 50))
  );
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox — loading state during verification', () => {
  it('disables board interaction while verifying (opacity-50 pointer-events-none)', async () => {
    const { container } = render(<PracticeWordHuntSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'CAR');

    // Submit a discovery word that requires validation
    btn.click();

    // Board wrapper should have opacity-50 and pointer-events-none while verifying
    const boardWrapper = container.querySelector('[data-testid="practice-board"]')?.parentElement;
    await waitFor(() => {
      expect(boardWrapper?.className).toContain('opacity-50');
      expect(boardWrapper?.className).toContain('pointer-events-none');
    }, { timeout: 100 });
  });

  it('shows a spinner during verification', async () => {
    const { container } = render(<PracticeWordHuntSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'CAR');

    btn.click();

    // Spinner should appear during verification
    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    }, { timeout: 100 });
  });

  it('removes opacity and spinner after verification completes', async () => {
    const { container } = render(<PracticeWordHuntSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'CAR');

    btn.click();

    // Wait for verification to complete
    await waitFor(() => {
      const boardWrapper = container.querySelector('[data-testid="practice-board"]')?.parentElement;
      expect(boardWrapper?.className).not.toContain('opacity-50');
    }, { timeout: 200 });
  });

  it('keeps submit button disabled while verifying', async () => {
    validatorCheck.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ isValid: true }), 100))
    );
    const { container } = render(<PracticeWordHuntSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'CAR');

    btn.click();

    // Board should have pointer-events-none during verification
    await waitFor(() => {
      const boardWrapper = container.querySelector('[data-testid="practice-board"]')?.parentElement;
      expect(boardWrapper?.className).toContain('pointer-events-none');
    }, { timeout: 50 });
  });
});
