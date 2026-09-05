/**
 * LastGameInsights — the free "Last class game" card on the teacher's
 * Review tab. Renders from useRecentClassroomGames; every string goes
 * through t() so tests see raw keys.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { LastGameInsights } from '../LastGameInsights';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';

vi.mock('@/hooks/useRecentClassroomGames');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

const players = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    studentId: `stu-${i}`,
    name: `Student ${i + 1}`,
    score: 100 - i * 5,
    lessonWordsFound: i % 2 === 0 ? ['cat', 'dog'] : ['cat'],
    lessonWordsMissed: i % 2 === 0 ? ['fox'] : ['dog', 'fox'],
    accuracyPct: i % 2 === 0 ? 67 : 33,
  }));

const baseGame: RecentClassroomGame = {
  gameCode: 'ABC123',
  gameMode: 'classic',
  playedAt: '2026-09-04T10:00:00Z',
  lessonIds: ['lesson-1'],
  players: players(12),
  missedWords: [
    { word: 'fox', missedBy: 12, total: 12, pct: 100 },
    { word: 'dog', missedBy: 6, total: 12, pct: 50 },
    { word: 'owl', missedBy: 5, total: 12, pct: 42 },
    { word: 'bee', missedBy: 4, total: 12, pct: 33 },
    { word: 'ant', missedBy: 3, total: 12, pct: 25 },
    { word: 'elk', missedBy: 2, total: 12, pct: 17 },
    { word: 'yak', missedBy: 1, total: 12, pct: 8 },
    { word: 'cat', missedBy: 0, total: 12, pct: 0 },
  ],
  totalLessonWords: 3,
  wordsNobodyFound: ['fox'],
  coveragePct: 67,
  averageAccuracyPct: 50,
  participation: { played: 12, roster: 14 },
};

const olderGame: RecentClassroomGame = {
  ...baseGame,
  gameCode: 'OLD999',
  gameMode: 'blast',
  playedAt: '2026-09-01T10:00:00Z',
  players: players(3),
  coveragePct: 100,
  wordsNobodyFound: [],
  missedWords: [{ word: 'cat', missedBy: 0, total: 3, pct: 0 }],
  averageAccuracyPct: 90,
  participation: { played: 3, roster: 14 },
};

function mockHook(state: Partial<ReturnType<typeof useRecentClassroomGames>>) {
  (useRecentClassroomGames as Mock).mockReturnValue({
    games: [], isLoading: false, error: null, refresh: vi.fn(), ...state,
  });
}

describe('LastGameInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state', () => {
    mockHook({ isLoading: true });
    render(<LastGameInsights classroomId="class-1" />);
    expect(screen.getByTestId('last-game-loading')).toBeInTheDocument();
  });

  it('shows the empty state with a hint to start a game from the Play tab', () => {
    mockHook({ games: [] });
    render(<LastGameInsights classroomId="class-1" />);
    expect(screen.getByTestId('last-game-empty')).toBeInTheDocument();
    expect(screen.getByText('teacher.lastGame.emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('teacher.lastGame.emptyHint')).toBeInTheDocument();
  });

  it('shows an error state with a retry that refreshes', () => {
    const refresh = vi.fn();
    mockHook({ error: new Error('boom'), refresh });
    render(<LastGameInsights classroomId="class-1" />);
    expect(screen.getByTestId('last-game-error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'teacher.lastGame.retry' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders header, stat tiles, review chips, student table and CTA for the latest game', () => {
    const onCreateReviewLesson = vi.fn();
    mockHook({ games: [baseGame, olderGame] });
    render(<LastGameInsights classroomId="class-1" onCreateReviewLesson={onCreateReviewLesson} />);

    // header — mode label + participation
    const header = screen.getByTestId('last-game-header');
    expect(within(header).getByText('teacher.lastGame.mode.classic')).toBeInTheDocument();
    expect(within(header).getByText('teacher.lastGame.playersPlayed')).toBeInTheDocument();

    // three stat tiles
    expect(screen.getByTestId('last-game-stat-coverage')).toHaveTextContent('67%');
    expect(screen.getByTestId('last-game-stat-nobody')).toHaveTextContent('1');
    expect(screen.getByTestId('last-game-stat-accuracy')).toHaveTextContent('50%');

    // words to review: top 6 with missedBy > 0, in order, with "missed by x/y"
    const chips = screen.getAllByTestId('review-chip');
    expect(chips.map((c) => c.getAttribute('data-word'))).toEqual(['fox', 'dog', 'owl', 'bee', 'ant', 'elk']);
    expect(chips[0]).toHaveTextContent('12/12');
    expect(chips[0]).toHaveTextContent('teacher.lastGame.missedBy');

    // per-student table: one row per player, name + score + found/missed
    const rows = screen.getAllByTestId('student-row');
    expect(rows).toHaveLength(12);
    expect(within(rows[0]).getByText('Student 1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('100')).toBeInTheDocument();
    expect(within(rows[0]).getByTestId('student-found')).toHaveTextContent('2');
    expect(within(rows[0]).getByTestId('student-missed')).toHaveTextContent('1');
    expect(within(rows[0]).getByTestId('student-bar')).toHaveStyle({ width: '67%' });

    // CTA hands the review words to the parent
    fireEvent.click(screen.getByRole('button', { name: 'teacher.lastGame.practiceCta' }));
    expect(onCreateReviewLesson).toHaveBeenCalledWith(['fox', 'dog', 'owl', 'bee', 'ant', 'elk']);
  });

  it('hides the CTA when there is no callback, and hides the chips when nothing was missed', () => {
    mockHook({ games: [olderGame] });
    render(<LastGameInsights classroomId="class-1" />);
    expect(screen.queryByRole('button', { name: 'teacher.lastGame.practiceCta' })).not.toBeInTheDocument();
    expect(screen.queryAllByTestId('review-chip')).toHaveLength(0);
    expect(screen.getByText('teacher.lastGame.nothingToReview')).toBeInTheDocument();
  });

  it('offers a previous-games selector only when more than one game exists, and switches games', () => {
    mockHook({ games: [baseGame] });
    const { unmount } = render(<LastGameInsights classroomId="class-1" />);
    expect(screen.queryByTestId('last-game-selector')).not.toBeInTheDocument();
    unmount();

    mockHook({ games: [baseGame, olderGame] });
    render(<LastGameInsights classroomId="class-1" />);
    const selector = screen.getByTestId('last-game-selector') as HTMLSelectElement;
    expect(selector.options).toHaveLength(2);

    fireEvent.change(selector, { target: { value: 'OLD999' } });

    expect(screen.getByTestId('last-game-stat-coverage')).toHaveTextContent('100%');
    expect(screen.getAllByTestId('student-row')).toHaveLength(3);
    expect(within(screen.getByTestId('last-game-header')).getByText('teacher.lastGame.mode.blast')).toBeInTheDocument();
  });

  it('never renders raw ids — only the resolved names from the data layer', () => {
    mockHook({ games: [baseGame] });
    const { container } = render(<LastGameInsights classroomId="class-1" />);
    expect(container.textContent).not.toMatch(/stu-\d/);
  });
});
