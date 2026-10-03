import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const fireRankConfetti = vi.fn();
vi.mock('@/utils/confettiUtils', () => ({
  fireRankConfetti: (...a: unknown[]) => fireRankConfetti(...a),
  fireVictoryConfetti: vi.fn(),
  cleanupConfetti: vi.fn(),
}));
vi.mock('@/lib/education/roundEndSound', () => ({
  playRoundEndCue: vi.fn(() => null),
  ROUND_WIN_SOUND: '',
  CLASS_SWEEP_SOUND: '',
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: true, loading: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { ClassroomTvResults } from '../ClassroomTvResults';
import type { ClassroomSummary } from '@/shared/types/classroom';

const t = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = (over: Partial<ClassroomSummary> = {}): ClassroomSummary => ({
  teacherName: 'Ms. Free',
  lessonNames: ['Common English'],
  lessonIds: ['lesson-1'],
  totalWords: 4,
  classFoundCount: 0,
  coverage: [
    { word: 'house', foundBy: [] },
    { word: 'water', foundBy: [] },
    { word: 'light', foundBy: [] },
    { word: 'earth', foundBy: [] },
  ],
  missedWords: ['house', 'water', 'light', 'earth'],
  masteryByPlayer: { Zoe: { found: 0, total: 4 } },
  podium: [
    { username: 'Zoe', score: 0, rank: 1 },
    { username: 'Ms. Free', score: 0, rank: 2 },
  ],
  ...over,
});

describe('ClassroomTvResults — a round no student played (bots-only practice)', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  const empty = () => base({ masteryByPlayer: {}, podium: [] });

  it('Given only practice bots played (the server ranks no students), Then the wall says it was a practice run instead of an empty line-up', () => {
    render(<ClassroomTvResults summary={empty()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-outcome', 'empty');
    expect(screen.getByText('eduLive.results.emptyTitle')).toBeInTheDocument();
    expect(screen.queryByText('eduLive.results.lineupTitle')).toBeNull();
    expect(screen.getByTestId('empty-round-card')).toHaveTextContent('eduLive.results.emptyBody');
    expect(screen.queryByTestId('podium-stage')).toBeNull();
  });

  it('Given an empty round, Then the next step is still one tap away', () => {
    render(<ClassroomTvResults summary={empty()} onRematch={() => {}} t={t} revealSettled />);
    expect(within(screen.getByTestId('classroom-tv-results')).getAllByRole('button').length).toBeGreaterThan(0);
  });
});
