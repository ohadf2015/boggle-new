/**
 * Tests for PastPerformanceCompare — surfaces "how did I do vs my own past
 * plays" on the Word Hunt daily results screen, plus a small randomized
 * celebratory flourish tag (variable reward — a bit different each play).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PastPerformanceCompare, computeComparison, pickFlourish } from '../PastPerformanceCompare';

const tReal = (key: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => {
  const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : key;
  const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : paramsWhenFallback;
  if (!params) return fallback;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    fallback,
  );
};

describe('computeComparison (pure logic)', () => {
  it('returns first-play when there is no prior history', () => {
    expect(computeComparison(500, null)).toEqual({ kind: 'first-play' });
  });

  it('returns new-best with a positive delta when today beats the prior best', () => {
    expect(computeComparison(500, { bestScore: 400, avgScore: 300, playCount: 3 }))
      .toEqual({ kind: 'new-best', delta: 100 });
  });

  it('returns vs-best with a negative delta when today is below the prior best', () => {
    expect(computeComparison(300, { bestScore: 400, avgScore: 350, playCount: 3 }))
      .toEqual({ kind: 'vs-best', delta: -100 });
  });
});

describe('pickFlourish (variable reward)', () => {
  it('picks deterministically from the pool given a fixed rng', () => {
    const first = pickFlourish(() => 0);
    const last = pickFlourish(() => 0.999);
    expect(first.key).not.toBe(last.key);
  });
});

describe('PastPerformanceCompare', () => {
  it('shows the first-play message when there is no history', () => {
    render(<PastPerformanceCompare currentScore={200} solved={false} past={null} t={tReal} />);
    expect(screen.getByText('Your first Word Hunt today — nice start!')).toBeInTheDocument();
  });

  it('shows a "new personal best" badge when today beats the prior best', () => {
    render(
      <PastPerformanceCompare
        currentScore={500}
        solved={true}
        past={{ bestScore: 400, avgScore: 300, playCount: 3 }}
        t={tReal}
      />,
    );
    expect(screen.getByText('New personal best!')).toBeInTheDocument();
  });

  it('shows the signed delta vs best when today is below the prior best', () => {
    render(
      <PastPerformanceCompare
        currentScore={300}
        solved={true}
        past={{ bestScore: 400, avgScore: 350, playCount: 3 }}
        t={tReal}
      />,
    );
    expect(screen.getByText('-100 vs your best')).toBeInTheDocument();
  });

  it('shows a celebratory flourish tag only when solved', () => {
    const { rerender } = render(
      <PastPerformanceCompare currentScore={500} solved={true} past={null} t={tReal} />,
    );
    const flourishTexts = ['On fire!', 'Nailed it!', 'Solid run!'];
    const hasFlourish = flourishTexts.some((text) => screen.queryByText(text) !== null);
    expect(hasFlourish).toBe(true);

    rerender(<PastPerformanceCompare currentScore={0} solved={false} past={null} t={tReal} />);
    flourishTexts.forEach((text) => expect(screen.queryByText(text)).not.toBeInTheDocument());
  });
});
