/**
 * ProgressDigestDashboard — last-lesson digest + Teacher Pro CTA.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProgressDigestDashboard } from '../ProgressDigestDashboard';

const refresh = vi.fn();
const mockGames = vi.fn();
vi.mock('@/hooks/useRecentClassroomGames', () => ({
  useRecentClassroomGames: (opts: unknown) => mockGames(opts),
}));

const proState = { hasPro: false, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => proState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const trackDigest = vi.fn();
vi.mock('@/lib/education/telemetry', () => ({
  trackEduProgressDigestViewed: (args: unknown) => trackDigest(args),
}));

const trackGrowth = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => trackGrowth(...args),
}));

const mockMood = vi.fn();
vi.mock('@/hooks/useClassRoundMood', () => ({
  useClassRoundMood: (opts: unknown) => mockMood(opts),
}));

const NOW = '2026-09-18T10:00:00.000Z';

function lessonGame() {
  return {
    playedAt: NOW,
    gameMode: 'vocab-quiz',
    gameCode: 'ABC123',
    participation: { played: 7, roster: 10 },
    averageAccuracyPct: 64,
    coveragePct: 72,
    players: [
      { studentId: 's1', name: 'Ada', accuracyPct: 90 },
      { studentId: 's2', name: 'Blaise', accuracyPct: 25 },
    ],
    missedWords: [{ word: 'ephemeral', pct: 80 }],
  };
}

function setGames(over: Record<string, unknown> = {}) {
  mockGames.mockReturnValue({
    games: [lessonGame()],
    isLoading: false,
    error: null,
    refresh,
    ...over,
  });
}

describe('ProgressDigestDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    proState.hasPro = false;
    proState.loading = false;
    mockMood.mockReturnValue({ count: 0, mood: null });
    setGames();
  });

  it('asks for the last game of the class it was handed', () => {
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(mockGames).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'c1', limit: 1 }));
  });

  it('prints last-lesson numbers a free teacher already owns', () => {
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.getByTestId('progress-digest-dashboard')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('64%')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
  });

  it('shows the Teacher Pro CTA for a free teacher', () => {
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.getByTestId('progress-digest-pro-cta')).toBeInTheDocument();
    expect(screen.getByTestId('progress-digest-pro-link')).toHaveAttribute('href', '/en/teacher/upgrade');
  });

  it('hides the Teacher Pro CTA once they already pay', () => {
    proState.hasPro = true;
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.queryByTestId('progress-digest-pro-cta')).not.toBeInTheDocument();
  });

  it('does not invent a report when the class has never played', () => {
    setGames({ games: [] });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.getByTestId('progress-digest-empty')).toHaveTextContent('teacher.digest.emptyNeverPlayed');
    expect(screen.queryByText('64%')).not.toBeInTheDocument();
  });

  it('surfaces a failed read as retry, not as never-played', () => {
    setGames({ games: [], error: new Error('net'), isLoading: false });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.getByTestId('progress-digest-error')).toBeInTheDocument();
    expect(screen.queryByTestId('progress-digest-empty')).not.toBeInTheDocument();
  });

  it('fires the digest-viewed event once numbers are known', () => {
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(trackDigest).toHaveBeenCalledWith({ hasPro: false, state: 'needsReview' });
  });

  it('attributes the upgrade click to this digest, not a generic gate', async () => {
    const user = userEvent.setup();
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    await user.click(screen.getByTestId('progress-digest-pro-link'));
    expect(trackGrowth).toHaveBeenCalledWith('landing_cta_clicked', { cta: 'progress_digest_teacher_pro' });
  });

  it('asks for the mood of the last game, not a made-up one', () => {
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(mockMood).toHaveBeenCalledWith({ classroomId: 'c1', gameCode: 'ABC123' });
  });

  it('prints the last-round mood above the Pro CTA when students rated', () => {
    mockMood.mockReturnValue({ count: 5, mood: 'great' });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    const line = screen.getByTestId('progress-digest-mood');
    expect(line).toHaveAttribute('data-mood', 'great');
    expect(line).toHaveAttribute('data-count', '5');
    expect(line).toHaveTextContent('teacher.digest.moodGreat');
    const cta = screen.getByTestId('progress-digest-pro-cta');
    expect(line.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('hides the mood line when the last game has no ratings', () => {
    mockMood.mockReturnValue({ count: 0, mood: null });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.queryByTestId('progress-digest-mood')).not.toBeInTheDocument();
  });

  it('does not show a mood when the class has never played', () => {
    mockMood.mockReturnValue({ count: 5, mood: 'great' });
    setGames({ games: [] });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.queryByTestId('progress-digest-mood')).not.toBeInTheDocument();
  });

  it('still shows the mood to a teacher who already pays', () => {
    proState.hasPro = true;
    mockMood.mockReturnValue({ count: 4, mood: 'rough' });
    render(<ProgressDigestDashboard classroomId="c1" classroomName="Year 7" rosterCount={10} />);
    expect(screen.getByTestId('progress-digest-mood')).toHaveAttribute('data-mood', 'rough');
    expect(screen.queryByTestId('progress-digest-pro-cta')).not.toBeInTheDocument();
  });
});
