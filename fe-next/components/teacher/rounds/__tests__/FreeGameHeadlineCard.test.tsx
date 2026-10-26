import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));
vi.mock('@/components/teacher/reports/MissedPracticeAction', () => ({ MissedPracticeAction: () => null }));
const games = vi.hoisted(() => ({ value: [] as RecentClassroomGame[], isLoading: false }));
const pro = vi.hoisted(() => ({ hasPro: false, loading: false, accessTrialExpires: null as string | null }));
vi.mock('@/hooks/useRecentClassroomGames', () => ({
  useRecentClassroomGames: () => ({ games: games.value, isLoading: games.isLoading, error: null, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => pro }));

import { FreeGameHeadlineCard } from '../FreeGameHeadlineCard';
import { RoundReportCard } from '../RoundReportCard';

const GAME: RecentClassroomGame = {
  gameCode: 'HDL001',
  gameMode: 'classic',
  playedAt: '2026-10-22T09:40:00Z',
  lessonIds: ['l1'],
  players: [
    { studentId: 'a', name: 'Noa', score: 400, lessonWordsFound: ['calm'], lessonWordsMissed: ['vast', 'keen', 'bold', 'grim'], accuracyPct: 20 },
    { studentId: 'b', name: 'Eli', score: 101, lessonWordsFound: ['calm', 'grim'], lessonWordsMissed: ['vast', 'keen', 'bold'], accuracyPct: 40 },
  ],
  missedWords: [
    { word: 'vast', missedBy: 2, total: 2, pct: 100 },
    { word: 'keen', missedBy: 2, total: 2, pct: 100 },
    { word: 'bold', missedBy: 2, total: 2, pct: 100 },
    { word: 'grim', missedBy: 1, total: 2, pct: 50 },
    { word: 'calm', missedBy: 0, total: 2, pct: 0 },
  ],
  totalLessonWords: 5,
  wordsNobodyFound: ['vast', 'keen', 'bold'],
  coveragePct: 40,
  averageAccuracyPct: 30,
  participation: { played: 2, roster: 25 },
};

beforeEach(() => {
  games.value = [GAME];
  games.isLoading = false;
  pro.hasPro = false;
  pro.loading = false;
  pro.accessTrialExpires = null;
});

describe('FreeGameHeadlineCard', () => {
  it('Given a free teacher after a real game, when shown, then players, class average, three missed words and a labelled Pro line appear', () => {
    render(<FreeGameHeadlineCard classroomId="c1" />);
    const card = screen.getByTestId('free-game-headline');
    expect(within(card).getByTestId('free-headline-players').textContent).toBe('teacher.lastGame.playersPlayed|2');
    expect(within(card).getByTestId('free-headline-average').textContent).toContain('251');
    expect(within(card).getAllByTestId('free-headline-missed').map((n) => n.textContent)).toEqual(['vast', 'keen', 'bold']);
    const upsell = within(card).getByTestId('free-headline-pro');
    expect(upsell.textContent).toContain('teacher.lastGame.proBadge');
    expect(upsell.textContent).toContain('teacher.lastGame.proLine');
    expect(upsell.getAttribute('href')).toBe('/en/teacher/upgrade');
  });

  it('Given the same game, when the round report renders, then its first missed words are the headline words (one shared list)', () => {
    render(
      <>
        <FreeGameHeadlineCard classroomId="c1" />
        <RoundReportCard game={GAME} hasPro={false} classroomId="c1" classroomName="7B" />
      </>,
    );
    const headline = screen.getAllByTestId('free-headline-missed').map((n) => n.textContent);
    const report = screen.getAllByTestId('round-report-missed-word').map((n) => n.querySelector('bdi')?.textContent);
    expect(report.slice(0, headline.length)).toEqual(headline);
  });

  it('Given only a solo rehearsal game, when shown, then no card and no Pro prompt appear', () => {
    games.value = [{ ...GAME, players: [GAME.players[0]], participation: { played: 1, roster: 25 } }];
    render(<FreeGameHeadlineCard classroomId="c1" />);
    expect(screen.queryByTestId('free-game-headline')).toBeNull();
  });

  it('Given the Pro check still loading, when shown, then nothing renders', () => {
    pro.loading = true;
    render(<FreeGameHeadlineCard classroomId="c1" />);
    expect(screen.queryByTestId('free-game-headline')).toBeNull();
  });

  it('Given a Pro teacher or a live trial, when shown, then the free card stands down for the full dashboard', () => {
    pro.hasPro = true;
    const { unmount } = render(<FreeGameHeadlineCard classroomId="c1" />);
    expect(screen.queryByTestId('free-game-headline')).toBeNull();
    unmount();
    pro.hasPro = false;
    pro.accessTrialExpires = '2999-01-01T00:00:00Z';
    render(<FreeGameHeadlineCard classroomId="c1" />);
    expect(screen.queryByTestId('free-game-headline')).toBeNull();
  });
});
