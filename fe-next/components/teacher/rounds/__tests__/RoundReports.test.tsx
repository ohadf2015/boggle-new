import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ROUND_FIXTURE } from '../roundFixture';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
let games: { games: unknown[]; isLoading: boolean; error: Error | null } = { games: [], isLoading: false, error: null };
vi.mock('@/hooks/useRecentClassroomGames', () => ({ useRecentClassroomGames: () => games }));
let hasPro = false;
let accessTrialExpires: string | null = null;
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro, accessTrialExpires, loading: false }) }));
vi.mock('../RoundReportCard', () => ({
  RoundReportCard: ({ game, hasPro: pro }: { game: { gameCode: string }; hasPro: boolean }) => (
    <div data-testid="card" data-pro={String(pro)}>{game.gameCode}</div>
  ),
}));

import { RoundReports } from '../RoundReports';

beforeEach(() => {
  games = { games: [], isLoading: false, error: null };
  hasPro = false;
  accessTrialExpires = null;
});

describe('RoundReports', () => {
  it('opens the newest round and lists older rounds as one-line rows', () => {
    games = { games: [ROUND_FIXTURE, { ...ROUND_FIXTURE, gameCode: 'FIX002' }], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual(['FIX001']);
    expect(screen.getAllByTestId('round-report-collapsed')).toHaveLength(1);
    expect(screen.getByRole('heading').textContent).toBe('teacher.lastGame.previousGames');
    expect(screen.getByTestId('round-report-collapsed').textContent).toContain('teacher.pulse.participation');
  });

  it('tapping an older round opens it instead', () => {
    games = { games: [ROUND_FIXTURE, { ...ROUND_FIXTURE, gameCode: 'FIX002' }], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    fireEvent.click(screen.getByTestId('round-report-collapsed'));
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual(['FIX002']);
  });

  it('passes the teacher plan down', () => {
    hasPro = true;
    games = { games: [ROUND_FIXTURE], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-pro', 'true');
  });

  it('unlocks the drill-down for a teacher on a live access trial, as the server does', () => {
    accessTrialExpires = new Date(Date.now() + 86_400_000).toISOString();
    games = { games: [ROUND_FIXTURE], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-pro', 'true');
  });

  it('keeps it locked once the access trial has lapsed', () => {
    accessTrialExpires = new Date(Date.now() - 86_400_000).toISOString();
    games = { games: [ROUND_FIXTURE], isLoading: false, error: null };
    render(<RoundReports classroomId="c1" classroomName="7B" />);
    expect(screen.getByTestId('card')).toHaveAttribute('data-pro', 'false');
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
