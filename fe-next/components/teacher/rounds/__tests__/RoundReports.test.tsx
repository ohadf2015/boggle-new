import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROUND_FIXTURE } from '../roundFixture';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
let games: { games: unknown[]; isLoading: boolean; error: Error | null } = { games: [], isLoading: false, error: null };
vi.mock('@/hooks/useRecentClassroomGames', () => ({ useRecentClassroomGames: () => games }));
let hasPro = false;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, loading: false }) }));
vi.mock('../RoundReportCard', () => ({
  RoundReportCard: ({ game, hasPro: pro }: { game: { gameCode: string }; hasPro: boolean }) => (
    <div data-testid="card" data-pro={String(pro)}>{game.gameCode}</div>
  ),
}));

import { RoundReports } from '../RoundReports';

beforeEach(() => {
  games = { games: [], isLoading: false, error: null };
  hasPro = false;
});

describe('RoundReports', () => {
  it('renders a report for every completed round, newest first as fetched', () => {
    games = { games: [ROUND_FIXTURE, { ...ROUND_FIXTURE, gameCode: 'FIX002' }], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual(['FIX001', 'FIX002']);
  });

  it('passes the teacher plan down', () => {
    hasPro = true;
    games = { games: [ROUND_FIXTURE], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-pro', 'true');
  });

  it('says how to get a report when no round has been played', () => {
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByText('teacher.lastGame.emptyTitle')).toBeInTheDocument();
  });

  it('says the read failed rather than showing an empty state', () => {
    games = { games: [], isLoading: false, error: new Error('x') };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByText('teacher.lastGame.error')).toBeInTheDocument();
    expect(screen.queryByText('teacher.lastGame.emptyTitle')).not.toBeInTheDocument();
  });
});
