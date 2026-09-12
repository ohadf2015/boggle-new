/**
 * The duel page — live or async — is a fixed-height phone screen.
 *
 * Same contract as the lobby: the subtree is one viewport and clips, the body
 * is locked (it ships `.screen-fit`, min-height:100dvh + overflow-y:auto, and
 * the layout hangs a footer and the global bottom nav below this route), and
 * exactly one inner region scrolls. Without the body half, a thumb during a
 * duel drags the whole document.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelGamePageClient from '../PageClient';

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
  DuelGameView: () => <div data-testid="duel-game-view" />,
  RealTimeDuelGame: () => <div data-testid="real-time-duel" />,
}));

describe('duel page shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue({ data: { display_name: 'Sam' } });
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
  });

  it('locks the body for an async turn, not just for a live duel', async () => {
    const { unmount } = render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('duel-game-view')).toBeInTheDocument());

    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
    unmount();
    expect(document.body.classList.contains('edu-shell-locked')).toBe(false);
  });

  it('gives the async turn exactly one scrolling region', async () => {
    const { container } = render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('duel-game-view')).toBeInTheDocument());

    const scrollers = container.querySelectorAll('.overflow-y-auto');
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0].className).toContain('edu-shell-scroll');
    expect(container.querySelectorAll('.min-h-dvh')).toHaveLength(0);
  });

  it('hands the live duel its own locked, non-scrolling stage', async () => {
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

    const { container } = render(<DuelGamePageClient duelId="duel-1" />);
    await waitFor(() => expect(screen.getByTestId('real-time-duel')).toBeInTheDocument());

    // The play panel owns scrolling during a live duel; the page offers none.
    expect(container.querySelectorAll('.overflow-y-auto')).toHaveLength(0);
    expect(document.body.classList.contains('edu-shell-locked')).toBe(true);
  });
});
