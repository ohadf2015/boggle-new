/**
 * The duel screen must know who you are playing.
 *
 * `getProfile(opponentId)` is the only source wired up here, and a student
 * reading ANOTHER student's `profiles` row gets `{ data: null, error: null }`
 * back — own-row RLS, the shape that looks exactly like "no such person"
 * (recurring-pitfalls Class 4). Measured live 2026-09-12: the in-duel
 * scoreboard and the reveal both read "OPPONENT" for a duel between two named
 * classmates. The lobby banks names against the user id; this screen reads them.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelGamePageClient from '../PageClient';
import { rememberStudentName } from '@/lib/education/duelOpponentNames';

const mockGetDuelById = vi.fn();
const mockGetProfile = vi.fn();

vi.mock('@/lib/supabase/education/duels', () => ({
  getDuelById: (...a: unknown[]) => mockGetDuelById(...a),
}));
vi.mock('@/lib/supabase', () => ({
  getProfile: (...a: unknown[]) => mockGetProfile(...a),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'student-1' }, loading: false }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="edu-header" />,
}));
vi.mock('@/components/education/duels', () => ({
  DuelGameView: ({ opponentName }: { opponentName: string }) => (
    <div data-testid="duel-game-view">{opponentName}</div>
  ),
  RealTimeDuelGame: ({ opponentName }: { opponentName: string }) => (
    <div data-testid="real-time-duel">{opponentName}</div>
  ),
}));

describe('duel screen — opponent name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockGetDuelById.mockResolvedValue({
      data: {
        id: 'duel-1',
        challenger_id: 'student-1',
        opponent_id: 'student-2',
        duel_type: 'realtime',
        lesson_id: 'lesson-1',
      },
      error: null,
    });
  });

  it('falls back to the name the lobby banked when the profile row is unreadable', async () => {
    // The exact RLS shape: no row, no error.
    mockGetProfile.mockResolvedValue({ data: null, error: null });
    rememberStudentName('student-2', 'Maya');

    render(<DuelGamePageClient duelId="duel-1" />);

    await waitFor(() =>
      expect(screen.getByTestId('real-time-duel')).toHaveTextContent('Maya')
    );
  });

  it('still prefers a real profile row when one comes back', async () => {
    mockGetProfile.mockResolvedValue({ data: { display_name: 'Ada' } });
    rememberStudentName('student-2', 'Stale');

    render(<DuelGamePageClient duelId="duel-1" />);

    await waitFor(() =>
      expect(screen.getByTestId('real-time-duel')).toHaveTextContent('Ada')
    );
  });

  it('uses the translated fallback when nothing at all is known', async () => {
    mockGetProfile.mockResolvedValue({ data: null, error: null });

    render(<DuelGamePageClient duelId="duel-1" />);

    await waitFor(() =>
      expect(screen.getByTestId('real-time-duel')).toHaveTextContent('common.opponent')
    );
  });
});
