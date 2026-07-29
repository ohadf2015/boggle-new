/**
 * DrillProgressionOverlay improvement-badge tests.
 *
 * The overlay surfaces the single most flattering TRUE "you got better" signal
 * (personal best > above your average > better than last > first attempt).
 * The badge appears alongside the delta, which is gated behind a ~1.2s timer,
 * so these tests use fake timers and advance past that gate.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DrillImprovement } from '@/shared/utils/drillImprovement';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: {
    div: ({ children, className, role, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} role={role} {...props}>{children}</div>
    ),
    p: ({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p className={className} {...props}>{children}</p>
    ),
    h2: ({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={className} {...props}>{children}</h2>
    ),
  },
}));

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

import DrillProgressionOverlay from '../DrillProgressionOverlay';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  targetDomain: 'processingSpeed' as const,
  newDomainScore: 72,
  scoreDelta: 8,
  overallScore: 65,
  tier: 'advanced' as const,
};

function improvement(over: Partial<DrillImprovement>): DrillImprovement {
  return {
    isPersonalBest: false,
    previousBest: 0,
    averageScore: 0,
    currentScore: 0,
    totalPlays: 0,
    improvedVsLast: false,
    ...over,
  };
}

/** Mount + advance past the delta gate (~1200ms) so the badge can render. */
function renderAndReveal(imp?: DrillImprovement) {
  render(<DrillProgressionOverlay {...baseProps} improvement={imp} />);
  act(() => { vi.advanceTimersByTime(1300); });
}

describe('DrillProgressionOverlay improvement badge', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the personal-best badge when this run beat the prior best', () => {
    renderAndReveal(improvement({ isPersonalBest: true, previousBest: 400, currentScore: 500, totalPlays: 3 }));
    expect(screen.getByTestId('drill-improvement-badge')).toBeInTheDocument();
    expect(screen.getByText('brain.drills.newPersonalBest')).toBeInTheDocument();
  });

  it('shows above-average when not a PB but beating the running average', () => {
    renderAndReveal(improvement({ previousBest: 600, averageScore: 300, currentScore: 400, totalPlays: 4 }));
    expect(screen.getByText('brain.drills.aboveAverage')).toBeInTheDocument();
  });

  it('shows better-than-last when only the previous session was beaten', () => {
    renderAndReveal(improvement({ previousBest: 600, averageScore: 500, currentScore: 450, totalPlays: 4, improvedVsLast: true }));
    expect(screen.getByText('brain.drills.betterThanLast')).toBeInTheDocument();
  });

  it('shows first-attempt encouragement on the very first play', () => {
    renderAndReveal(improvement({ totalPlays: 0, currentScore: 200 }));
    expect(screen.getByText('brain.drills.firstAttempt')).toBeInTheDocument();
  });

  it('shows no badge when there is no genuine improvement', () => {
    renderAndReveal(improvement({ previousBest: 600, averageScore: 500, currentScore: 250, totalPlays: 4 }));
    expect(screen.queryByTestId('drill-improvement-badge')).not.toBeInTheDocument();
  });

  it('shows no badge when improvement prop is omitted', () => {
    renderAndReveal(undefined);
    expect(screen.queryByTestId('drill-improvement-badge')).not.toBeInTheDocument();
  });
});
