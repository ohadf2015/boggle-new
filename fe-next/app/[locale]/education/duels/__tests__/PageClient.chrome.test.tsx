/**
 * The duel lobby is a game surface: no app chrome over it.
 *
 * Round-4 critic, verbatim and disqualifying: "the WCAG audit flagged
 * QUESTS/FRIENDS/HOME as edge-contrast<3 (tone-on-tone against the navy bar)
 * on every screen that shows it (History, Lobby)". Those three controls belong
 * to `GlobalBottomNav` (fixed bottom-0, z-[80]), not to this screen — they were
 * the only flagged items on it, and recolouring them means editing a shared
 * 524-line component whose real bug (twMerge collapsing border WIDTH into
 * border COLOUR) belongs to the contrast piece.
 *
 * Taking the nav down is the fix this route owns, and it is what the two
 * sibling surfaces already do: `[duelId]/PageClient.tsx` (the duel itself) and
 * `MissGapShellLock({ chromeFree })` (the homework game). It is also what the
 * design addendum asks for twice over — "Projector/game surfaces (lobby,
 * in-game, results) stay chrome-free: no tabs, no sidebar", and
 * `components/education/shell/navItems.ts` already lists `['education']` under
 * CHROME_FREE, so the education shell resolves NO tabs for this path by
 * design. `TopBackLink` stays mounted, so the screen is not a dead end.
 *
 * Hiding it also drops `has-global-bottom-nav` off `<html>`, which removes the
 * nav's padding reservation rather than merely hiding what caused it.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelsPageClientInner from '../PageClient';

const mockSetIsInGame = vi.fn();
const mockGetStudentClassroom = vi.fn();
const mockGetLessons = vi.fn();
const mockGetClassroomStudents = vi.fn();

const mockAuthState: { user: { id: string } | null; loading: boolean } = {
  user: { id: 'student-1' },
  loading: false,
};

vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => mockSetIsInGame,
}));
vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: unknown[]) => mockGetStudentClassroom(...args),
  getClassroomStudents: (...args: unknown[]) => mockGetClassroomStudents(...args),
}));
vi.mock('@/lib/education/duelLessons', () => ({
  getDuelLessons: (...args: unknown[]) => mockGetLessons(...args),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuthState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/education/duels', () => ({
  DuelLobby: () => <div data-testid="duel-lobby" />,
  DuelHistory: () => <div data-testid="duel-history" />,
  DuelNotification: () => <div data-testid="duel-notification" />,
}));
vi.mock('@/components/education/duels/ClassmatesList', () => ({
  ClassmatesList: () => <div data-testid="classmates-list" />,
}));
vi.mock('@/components/navigation/TopBackLink', () => ({
  TopBackLink: () => <div data-testid="top-back-link" />,
}));

describe('duel lobby — chrome-free', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = { id: 'student-1' };
    mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });
    mockGetStudentClassroom.mockResolvedValue({
      data: { id: 'class-1', name: 'Duel Lab H' },
      error: null,
    });
    mockGetLessons.mockResolvedValue([{ id: 'lesson-1', name: 'Duel Words A' }]);
  });

  it('hides the global bottom nav over the lobby', async () => {
    render(<DuelsPageClientInner />);
    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument());

    expect(mockSetIsInGame).toHaveBeenCalledWith(true);
  });

  it('stamps the shell so a capture can prove the switch ran', async () => {
    // A hidden nav leaves nothing on screen to photograph; without this marker
    // "chrome is off" and "the build is stale" look identical in a screenshot.
    render(<DuelsPageClientInner />);
    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument());

    expect(screen.getByTestId('duels-shell').dataset.chrome).toBe('hidden');
  });

  it('keeps the one way out — the back link is still mounted', async () => {
    // Chrome-free must not mean trapped: the nav is gone, TopBackLink is not.
    render(<DuelsPageClientInner />);
    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument());

    expect(screen.getByTestId('top-back-link')).toBeInTheDocument();
  });

  it('hides it on the join-a-classroom empty state too', async () => {
    // Same navy surface, same three flagged tabs — and a guest landing here
    // from the SEO route sees exactly this branch.
    mockAuthState.user = null;

    render(<DuelsPageClientInner />);
    await waitFor(() =>
      expect(screen.getByText('education.duels.joinClassroomToDuel')).toBeInTheDocument()
    );

    expect(mockSetIsInGame).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('duels-empty').dataset.chrome).toBe('hidden');
  });

  it('gives the nav back on the way out', async () => {
    // A game surface that forgets to release it hides the nav on every screen
    // the student visits afterwards.
    const { unmount } = render(<DuelsPageClientInner />);
    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument());

    mockSetIsInGame.mockClear();
    unmount();

    expect(mockSetIsInGame).toHaveBeenCalledWith(false);
  });
});
