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

// Stub GridComponent so practice tests can trigger onWordSubmit without
// dragging through framer-motion / earthquake / cosmetic providers.
// Real GridComponent is exercised by daily-mode tests; here we only
// verify practice's wiring around it.
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

import PracticeClassicSandbox from '../PracticeClassicSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeClassicSandbox redesigned', () => {
  it('renders the real GridComponent (via stub)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('grid-component-stub')).toBeInTheDocument();
  });

  it('does NOT render a submit button (drag-release auto-submits)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.classic.submit' })).toBeNull();
  });

  it('does NOT render a reset button (auto-clear on next drag)', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByRole('button', { name: 'practice.classic.reset' })).toBeNull();
  });

  it('renders the inline PracticeCoachTip so the player learns by doing', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.getByTestId('practice-coach-tip')).toBeInTheDocument();
  });

  it('renders a goal indicator pill (0/3)', () => {
    render(<PracticeClassicSandbox />);
    const pill = screen.getByTestId('practice-goal-indicator');
    expect(pill).toHaveTextContent('0');
    expect(pill).toHaveTextContent('3');
  });

  it('routes onWordSubmit through the practice validator', async () => {
    render(<PracticeClassicSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'STAR');
    fireEvent.click(btn);
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledWith('STAR'));
  });

  it('chain CTA hidden until goal reached', () => {
    render(<PracticeClassicSandbox />);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();
  });
});
