/**
 * Opening a duel URL directly — a refresh mid-duel, or the link a classmate
 * sent — used to eject the student to /education.
 *
 * `isAuthenticated` is derived from user AND profile, and the profile resolves
 * a beat after the session does. On a full page load there is therefore a
 * window where `loading` is already false, `user` is set, and
 * `isAuthenticated` is still false — the late source flipping after the early
 * render (recurring-pitfalls Class 1). The guard read that window as "signed
 * out" and redirected. A signed-in user is one with a user; the profile is not
 * part of that question.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelGamePageClient from '../PageClient';

const mockGetDuelById = vi.fn();
const mockGetProfile = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/education/duels', () => ({
  getDuelById: (...args: unknown[]) => mockGetDuelById(...args),
}));
vi.mock('@/lib/supabase', () => ({
  getProfile: (...args: unknown[]) => mockGetProfile(...args),
}));

// user present, profile not yet: exactly the state a full page load passes through
const authState = {
  user: { id: 'student-1', email: 's1@example.com' },
  isAuthenticated: false,
  loading: false,
};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/components/education/duels', () => ({
  DuelGameView: () => <div data-testid="duel-game-view" />,
  RealTimeDuelGame: () => <div data-testid="real-time-duel-game" />,
}));

describe('DuelGamePageClient — a direct visit keeps the student in the duel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockGetProfile.mockResolvedValue({ data: { display_name: 'Maya' }, error: null });
  });

  it('does not bounce to /education while only the profile is still loading', async () => {
    render(<DuelGamePageClient duelId="duel-1" />);

    await waitFor(() =>
      expect(screen.getByTestId('real-time-duel-game')).toBeInTheDocument()
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('still sends a genuinely signed-out visitor away', async () => {
    const realUser = authState.user;
    authState.user = null;
    try {
      render(<DuelGamePageClient duelId="duel-1" />);
      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/en/education'));
    } finally {
      authState.user = realUser;
    }
  });
});
