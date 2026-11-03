import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const motionProps = vi.fn();
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, initial, animate, transition, ...rest }: Record<string, unknown> & { children?: React.ReactNode }) => {
      motionProps({ initial, animate, transition });
      return <div {...(rest as object)}>{children}</div>;
    },
  },
}));
vi.mock('../CoinUnlockCard', () => ({ CoinUnlockCard: () => <div data-testid="coin-unlock" /> }));

import { WordHuntAnswerReveal } from '../WordHuntAnswerReveal';

const base = { targetWord: 'crane', language: 'en' as const, revealCost: 50, currentCoins: 100, onReveal: vi.fn(), onSpendStart: vi.fn(), t: (k: string) => k };

describe('WordHuntAnswerReveal', () => {
  beforeEach(() => {
    motionProps.mockClear();
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as unknown as typeof window.matchMedia;
  });

  it('given the player pays for the reveal in this view, then the letters flip in one by one, in order', () => {
    const { rerender } = render(<WordHuntAnswerReveal {...base} revealed={false} />);
    rerender(<WordHuntAnswerReveal {...base} revealed />);
    expect(screen.getByTestId('answer-reveal-word').textContent).toBe('CRANE');
    const delays = motionProps.mock.calls.map(([p]) => (p.transition as { delay: number }).delay);
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(motionProps.mock.calls[0][0].initial).toMatchObject({ rotateX: -90 });
  });

  it('given an answer bought earlier, then it renders settled', () => {
    render(<WordHuntAnswerReveal {...base} revealed />);
    expect(screen.getByTestId('answer-reveal-word').textContent).toBe('CRANE');
    expect(motionProps.mock.calls.every(([p]) => p.initial === undefined)).toBe(true);
  });
});
