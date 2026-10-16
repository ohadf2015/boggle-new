import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomeDailyHero } from '../HomeDailyHero';
import type { DailyChallengeStats } from '@/hooks/useDailyChallengeStats';

// next primitives → plain DOM so the CTA text/skeletons are queryable in jsdom.
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: any) => <img {...props} />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const T_MAP: Record<string, string> = {
  'daily.title': 'Daily Challenge',
  'daily.play': 'PLAY',
  'daily.viewResults': 'VIEW RESULTS',
  'daily.openHub': 'DAILY HUB',
  'landing.home.todaysPuzzle': "Today's Puzzle",
};
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'landing.home.puzzleNo') return `Daily #${params?.n ?? 0}`;
      if (key === 'landing.home.resetsIn') return `Resets in ${params?.time ?? ''}`;
      if (key === 'landing.home.dayStreak') return `${params?.n ?? 0}d`;
      return T_MAP[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// The hook under test's *contract* — the component must gate on `loading`.
let mockStats: DailyChallengeStats;
vi.mock('@/hooks/useDailyChallengeStats', () => ({
  useDailyChallengeStats: () => mockStats,
}));

// The card IS today's Word Wheel, so its CTA follows Word Wheel's played state.
let mockPlayed: { loading: boolean; today: { wordHunt: boolean; wordWheel: boolean; wordTower: boolean; connections: boolean } };
vi.mock('@/hooks/useDailyPlayedStatus', () => ({
  useDailyPlayedStatus: () => mockPlayed,
}));

vi.mock('@/hooks/useWeeklyChest', () => ({
  useWeeklyChest: () => ({
    loading: false,
    currentStreak: 0,
    completedDates: [] as string[],
    cycleStart: '',
  }),
}));

vi.mock('@/utils/dailyChallenge/storage', () => ({
  getLastSevenDaysCompletion: () => [] as string[],
}));

vi.mock('@/utils/growthTracking', () => ({
  trackLandingCtaClick: vi.fn(),
}));

function baseStats(over: Partial<DailyChallengeStats> = {}): DailyChallengeStats {
  return {
    countdown: '05:00:00',
    hasPlayed: false,
    hasSolved: false,
    streak: 0,
    puzzleNumber: 173,
    isClient: true,
    loading: false,
    ...over,
  };
}

describe('HomeDailyHero — CTA hydration gate', () => {
  beforeEach(() => {
    mockStats = baseStats();
    mockPlayed = { loading: false, today: { wordHunt: false, wordWheel: false, wordTower: false, connections: false } };
  });

  it('shows a skeleton for the CTA while the daily status is still loading — never the optimistic PLAY default', () => {
    mockStats = baseStats({ loading: true, hasPlayed: false, hasSolved: false });
    mockPlayed.loading = true;
    render(<HomeDailyHero preloadedStats={{ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: true }} />);

    expect(screen.getByTestId('daily-cta-skeleton')).toBeInTheDocument();
    // The buggy behaviour was rendering PLAY here, which then snapped to VIEW RESULTS.
    expect(screen.queryByText('PLAY')).not.toBeInTheDocument();
    expect(screen.queryByText('VIEW RESULTS')).not.toBeInTheDocument();
  });

  it('keeps the pending CTA a lit lime action bar, not a dark empty slot', () => {
    mockStats = baseStats({ loading: true });
    mockPlayed.loading = true;
    render(<HomeDailyHero preloadedStats={{ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: true }} />);

    const pending = screen.getByTestId('daily-cta-skeleton');
    expect(pending.className).toContain('bg-neo-lime');
    expect(pending.querySelector('svg')).not.toBeNull();
  });

  it('sends the player to the daily hub, not the wheel results, once the wheel is done', () => {
    // Given today's Word Wheel is finished
    mockStats = baseStats({ loading: false, hasPlayed: true, hasSolved: true });
    mockPlayed.today.wordWheel = true;
    // When the home card renders
    render(<HomeDailyHero preloadedStats={{ hasPlayed: true, hasSolved: true, currentStreak: 3, loading: false }} />);
    // Then it links to the hub and says so
    expect(screen.queryByTestId('daily-cta-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('home-daily-hero')).toHaveAttribute('href', '/en/daily');
    expect(screen.getByText('DAILY HUB')).toBeInTheDocument();
    expect(screen.queryByText('VIEW RESULTS')).not.toBeInTheDocument();
    expect(screen.queryByText('PLAY')).not.toBeInTheDocument();
  });

  it('renders PLAY once a not-yet-played daily resolves', () => {
    mockStats = baseStats({ loading: false, hasPlayed: false, hasSolved: false });
    render(<HomeDailyHero preloadedStats={{ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: false }} />);

    expect(screen.queryByTestId('daily-cta-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('PLAY')).toBeInTheDocument();
    expect(screen.queryByText('VIEW RESULTS')).not.toBeInTheDocument();
  });

  // Any finished daily makes the hub the next stop: it shows what is left today,
  // the streak and the weekly chest — the wheel's results screen shows none of that.
  it('given only Word Hunt is played today, sends the player to the daily hub', () => {
    mockStats = baseStats({ hasPlayed: true, hasSolved: true });
    mockPlayed.today = { wordHunt: true, wordWheel: false, wordTower: false, connections: false };
    render(<HomeDailyHero preloadedStats={{ hasPlayed: true, hasSolved: true, currentStreak: 2, loading: false }} />);
    expect(screen.getByTestId('home-daily-hero')).toHaveAttribute('href', '/en/daily');
    expect(screen.getByText('DAILY HUB')).toBeInTheDocument();
  });

  it('given nothing is played today, links straight into the Word Wheel', () => {
    render(<HomeDailyHero preloadedStats={{ hasPlayed: false, hasSolved: null, currentStreak: 0, loading: false }} />);
    expect(screen.getByTestId('home-daily-hero')).toHaveAttribute('href', '/en/daily/word-wheel');
    expect(screen.getByText('PLAY')).toBeInTheDocument();
  });

  it('given the played state is still resolving, shows the skeleton even if the hunt stats are in', () => {
    mockStats = baseStats({ loading: false });
    mockPlayed.loading = true;
    render(<HomeDailyHero />);
    expect(screen.getByTestId('daily-cta-skeleton')).toBeInTheDocument();
  });
});
