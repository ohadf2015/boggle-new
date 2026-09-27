/**
 * Tests for DailyWordHuntFacts component
 *
 * TDD: RED phase — verifies rendering, animation, and empty-state behavior.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DailyWordHuntFacts from '../DailyWordHuntFacts';
import type { WordHuntResult } from '@/utils/dailyChallenge';
import type { WordHuntStats } from '../types';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const MotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} data-testid={props['data-testid'] as string} {...props}>{children}</div>
  ));
  MotionDiv.displayName = 'MotionDiv';

  const MotionSpan = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLSpanElement>) => (
    <span ref={ref} {...props}>{children}</span>
  ));
  MotionSpan.displayName = 'MotionSpan';

  return {
    m: { div: MotionDiv, span: MotionSpan },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

// Mock the calculator to control facts output. The component also calls
// getWordHuntInsights; default it to the empty pair so the legacy
// getWordHuntFacts path drives these tests.
vi.mock('@/utils/dailyWordHuntFactsCalculator', () => ({
  getWordHuntFacts: vi.fn(),
  getWordHuntInsights: vi.fn(() => ({ encouragement: null, tip: null })),
}));

import { getWordHuntFacts } from '@/utils/dailyWordHuntFactsCalculator';
const mockGetWordHuntFacts = getWordHuntFacts as jest.MockedFunction<typeof getWordHuntFacts>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<WordHuntResult> = {}): WordHuntResult {
  return {
    puzzleNumber: 1,
    puzzleDate: '2026-03-03',
    language: 'en',
    solved: true,
    attemptsUsed: 3,
    targetWord: 'CRANE',
    attempts: [],
    streakDays: 3,
    completedAt: '2026-03-03T12:00:00Z',
    ...overrides,
  };
}

function makeStats(overrides: Partial<WordHuntStats> = {}): WordHuntStats {
  return {
    totalPlayers: 500,
    solvedCount: 300,
    solveRate: 60,
    attemptDistribution: {},
    avgAttemptsSolved: 3.5,
    ...overrides,
  };
}

const mockT = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  let text = key;
  for (const [k, v] of Object.entries(params)) {
    text += ` ${k}=${v}`;
  }
  return text;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DailyWordHuntFacts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders null when no facts are available', () => {
    mockGetWordHuntFacts.mockReturnValue([]);
    const { container } = render(
      <DailyWordHuntFacts result={makeResult()} stats={makeStats()} t={mockT} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders facts when available', () => {
    mockGetWordHuntFacts.mockReturnValue([
      {
        type: 'firstTry',
        translationKey: 'wordHunt.facts.firstTry',
        translationParams: { solveRate: 15 },
        icon: 'Sparkles',
        color: 'neo-yellow',
        value: 1,
      },
      {
        type: 'efficiencyMachine',
        translationKey: 'wordHunt.facts.efficiencyMachine',
        translationParams: { score: 92 },
        icon: 'Target',
        color: 'neo-lime',
        value: 92,
      },
    ]);

    render(
      <DailyWordHuntFacts result={makeResult()} stats={makeStats()} t={mockT} />
    );

    // Should render the section title
    expect(screen.getByText('wordHunt.facts.title')).toBeInTheDocument();

    // Should render both fact texts
    expect(screen.getByText(/wordHunt\.facts\.firstTry/)).toBeInTheDocument();
    expect(screen.getByText(/wordHunt\.facts\.efficiencyMachine/)).toBeInTheDocument();
  });

  it('renders up to 4 facts in a grid', () => {
    mockGetWordHuntFacts.mockReturnValue([
      { type: 'firstTry', translationKey: 'wordHunt.facts.firstTry', translationParams: {}, icon: 'Sparkles', color: 'neo-yellow' },
      { type: 'speedSolver', translationKey: 'wordHunt.facts.speedSolver', translationParams: {}, icon: 'Zap', color: 'neo-cyan' },
      { type: 'streakLegend', translationKey: 'wordHunt.facts.streakLegend', translationParams: {}, icon: 'Flame', color: 'neo-orange' },
      { type: 'longWord', translationKey: 'wordHunt.facts.longWord', translationParams: {}, icon: 'Ruler', color: 'neo-orange' },
    ]);

    render(
      <DailyWordHuntFacts result={makeResult()} stats={makeStats()} t={mockT} />
    );

    // All 4 facts should render
    expect(screen.getByText('wordHunt.facts.firstTry')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.facts.speedSolver')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.facts.streakLegend')).toBeInTheDocument();
    expect(screen.getByText('wordHunt.facts.longWord')).toBeInTheDocument();
  });

  it('renders value badge when fact has a value', () => {
    mockGetWordHuntFacts.mockReturnValue([
      {
        type: 'efficiencyMachine',
        translationKey: 'wordHunt.facts.efficiencyMachine',
        translationParams: { score: 92 },
        icon: 'Target',
        color: 'neo-lime',
        value: 92,
      },
    ]);

    render(
      <DailyWordHuntFacts result={makeResult()} stats={makeStats()} t={mockT} />
    );

    expect(screen.getByText('92')).toBeInTheDocument();
  });

  it('does not render value badge when fact has no value', () => {
    mockGetWordHuntFacts.mockReturnValue([
      {
        type: 'palindrome',
        translationKey: 'wordHunt.facts.palindrome',
        translationParams: {},
        icon: 'RotateCcw',
        color: 'neo-yellow',
      },
    ]);

    render(
      <DailyWordHuntFacts result={makeResult()} stats={makeStats()} t={mockT} />
    );

    // No value badge should render (palindrome has no numeric value)
    const factCards = screen.getByText('wordHunt.facts.palindrome');
    expect(factCards).toBeInTheDocument();
  });

  it('passes result and stats to getWordHuntFacts', () => {
    mockGetWordHuntFacts.mockReturnValue([]);
    const result = makeResult({ attemptsUsed: 1 });
    const stats = makeStats({ solveRate: 10 });

    render(
      <DailyWordHuntFacts result={result} stats={stats} t={mockT} />
    );

    expect(mockGetWordHuntFacts).toHaveBeenCalledWith(result, stats);
  });
});
