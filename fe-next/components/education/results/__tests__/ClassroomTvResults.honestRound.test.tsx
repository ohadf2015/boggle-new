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

describe('ClassroomTvResults — an honest round end', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    fireRankConfetti.mockClear();
  });
  afterEach(cleanup);

  it('Given nobody scored, Then no confetti loop, no crown and an honest zero note', () => {
    render(<ClassroomTvResults summary={base()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.queryByTestId('celebration-loop')).toBeNull();
    expect(screen.queryByTestId('podium-crown')).toBeNull();
    expect(screen.getByTestId('podium-zero-note')).toBeInTheDocument();
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-outcome', 'zero');
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-outcome', 'zero');
    expect(fireRankConfetti).not.toHaveBeenCalled();
  });

  it('Given nobody scored, Then the heading is a line-up, not "Top scorers"', () => {
    render(<ClassroomTvResults summary={base()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByText('eduLive.results.lineupTitle')).toBeInTheDocument();
    expect(screen.queryByText('education.results.podium.title')).toBeNull();
  });

  it('Given the results screen was reloaded several times, Then the round chip follows the server count, not mount count', () => {
    const key = 'lexiclash.edu.round-history.Ms. Free::lesson-1::class';
    window.sessionStorage.setItem(key, JSON.stringify(Array.from({ length: 9 }, () => ({ score: 0, rank: 0, players: 1, sweep: false, at: 1 }))));
    render(<ClassroomTvResults summary={base({ roundsPlayed: 6 })} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByText('education.results.moment.roundOfSession:{"round":6}')).toBeInTheDocument();
  });

  it('Given nobody scored, Then there is no drumroll: the final frame paints at once', () => {
    render(<ClassroomTvResults summary={base()} onRematch={() => {}} t={t} />);
    expect(screen.getByTestId('classroom-tv-results')).toHaveAttribute('data-round-end-stage', 'done');
  });

  it('Given one student scored and the teacher sat out, Then it is a solo round, not a winner', () => {
    const summary = base({
      classFoundCount: 1,
      podium: [
        { username: 'Zoe', score: 130, rank: 1 },
        { username: 'Ms. Free', score: 0, rank: 2 },
      ],
    });
    render(<ClassroomTvResults summary={summary} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-outcome', 'solo');
    expect(screen.queryByText('Ms. Free')).toBeNull();
  });

  it('Given a two-way tie, Then the spotlight names both leaders', () => {
    const summary = base({
      classFoundCount: 2,
      masteryByPlayer: { Maya: { found: 1, total: 4 }, Leo: { found: 1, total: 4 } },
      podium: [
        { username: 'Maya', score: 90, rank: 1 },
        { username: 'Leo', score: 90, rank: 2 },
      ],
    });
    render(<ClassroomTvResults summary={summary} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('winner-spotlight')).toHaveAttribute('data-outcome', 'tie');
    expect(screen.getByTestId('winner-names')).toHaveTextContent('Maya & Leo');
  });
});

describe('ClassroomTvResults — clear next steps for the teacher', () => {
  afterEach(cleanup);

  it('Given an exit path, Then Back to class uses it instead of a raw link', () => {
    const onBackToClass = vi.fn();
    render(
      <ClassroomTvResults summary={base()} onRematch={() => {}} onBackToClass={onBackToClass} t={t} revealSettled />
    );
    fireEvent.click(screen.getByTestId('classroom-tv-back-to-class'));
    expect(onBackToClass).toHaveBeenCalledTimes(1);
  });

  it('Given a way back to the lobby, Then Switch game sits in the secondary row and calls it', () => {
    const onChangeGame = vi.fn();
    render(
      <ClassroomTvResults summary={base()} onRematch={() => {}} onChangeGame={onChangeGame} t={t} revealSettled />
    );
    const row = screen.getByTestId('tv-secondary-row');
    fireEvent.click(within(row).getByTestId('classroom-tv-dismiss'));
    expect(onChangeGame).toHaveBeenCalledTimes(1);
  });

  it('Given a phone, Then Play again sits right after the winner, above the word lists', () => {
    render(<ClassroomTvResults summary={base()} onRematch={() => {}} t={t} revealSettled />);
    expect(screen.getByTestId('host-next-actions').className).toContain('max-lg:order-first');
  });

  it('Given a Pro teacher, Then the report link is in the same row', () => {
    render(<ClassroomTvResults summary={base()} onRematch={() => {}} t={t} revealSettled />);
    const row = screen.getByTestId('tv-secondary-row');
    expect(within(row).getByTestId('full-report-link')).toHaveAttribute('href', '/en/teacher/reports');
  });
});
