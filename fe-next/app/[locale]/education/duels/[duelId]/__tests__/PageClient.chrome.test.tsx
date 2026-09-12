/**
 * A duel is a game surface: no app chrome over it.
 *
 * Captured 2026-09-12 at 390x844: `GlobalBottomNav` (fixed bottom-0, z-[80])
 * painted its QUESTS / FRIENDS / HOME tabs across the bottom of the live board
 * AND across the reveal's REMATCH row — three tappable controls belonging to
 * another screen sitting on top of the duel's only primary action, and three
 * more items for contrast-check to flag on a screen that should be chrome-free.
 *
 * The app already has the switch for this (`useHideNavigation`, which
 * `GlobalBottomNav` reads as `isInGame`); the duel screen simply never threw
 * it. Flip it on mount, and back on the way out — a game surface that forgets
 * to release it hides the nav on every screen after it.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelGamePageClient from '../PageClient';

const mockSetIsInGame = vi.fn();
const mockGetDuelById = vi.fn();
const mockGetProfile = vi.fn();

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));
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
  DuelGameView: () => <div data-testid="duel-game-view" />,
  RealTimeDuelGame: () => <div data-testid="real-time-duel" />,
}));

describe('duel screen — chrome-free', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue({ data: { display_name: 'Maya' } });
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

  it('hides the global bottom nav while a live duel is on screen', async () => {
    render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('real-time-duel')).toBeInTheDocument());

    expect(mockSetIsInGame).toHaveBeenCalledWith(true);
  });

  it('hides it for an async turn too — same surface, same chrome', async () => {
    mockGetDuelById.mockResolvedValue({
      data: {
        id: 'duel-1',
        challenger_id: 'student-1',
        opponent_id: 'student-2',
        duel_type: 'async',
        lesson_id: 'lesson-1',
      },
      error: null,
    });

    render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('duel-game-view')).toBeInTheDocument());

    expect(mockSetIsInGame).toHaveBeenCalledWith(true);
  });

  it('stamps the surface so a capture can prove the switch ran', async () => {
    // A hidden nav leaves nothing on screen to photograph; without this marker
    // "chrome is off" and "the build is stale" look identical in a screenshot.
    render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('real-time-duel')).toBeInTheDocument());

    expect(screen.getByTestId('duel-surface').dataset.chrome).toBe('hidden');
  });

  it('gives the nav back on the way out', async () => {
    const { unmount } = render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('real-time-duel')).toBeInTheDocument());

    mockSetIsInGame.mockClear();
    unmount();

    expect(mockSetIsInGame).toHaveBeenCalledWith(false);
  });
});
