/**
 * A rematch offer has to reach the student wherever they are.
 *
 * The handshake lights up the other podium — but the loser of a duel very often
 * taps LOBBY the second the reveal appears. Their socket is then on the lobby
 * page, which had no idea what `duel:rematch-offered` was: the offer sat unseen
 * until it expired. That is the same silent-no-op shape as the bug this round
 * fixed, one screen over (recurring-pitfalls Class 4).
 *
 * So the lobby's notification toast answers rematch offers too, and accepting
 * from here matches the pact exactly like accepting from the podium does.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DuelNotification from '../DuelNotification';
import { useDuelSocket } from '@/hooks/useDuelSocket';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/hooks/useDuelSocket');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, _f?: unknown, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key,
  }),
}));
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('DuelNotification — rematch offers', () => {
  const emit = vi.fn();
  let offered: ((d: unknown) => void) | null = null;
  let withdrawn: ((d: unknown) => void) | null = null;
  let created: ((d: unknown) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    offered = null;
    withdrawn = null;
    created = null;
    (useDuelSocket as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      socket: { emit },
      onChallengeReceived: vi.fn(() => () => {}),
      onRematchOffered: vi.fn((cb: (d: unknown) => void) => {
        offered = cb;
        return () => {};
      }),
      onRematchWithdrawn: vi.fn((cb: (d: unknown) => void) => {
        withdrawn = cb;
        return () => {};
      }),
      onRematchPending: vi.fn(() => () => {}),
      onRematchInvited: vi.fn(() => () => {}),
      onDuelCreated: vi.fn((cb: (d: unknown) => void) => {
        created = cb;
        return () => {};
      }),
      onError: vi.fn(() => () => {}),
    });
  });

  const OFFER = {
    fromUserId: 'opponent-1',
    fromName: 'Maya',
    lessonId: 'lesson-1',
    duelId: 'duel-1',
  };

  it('shows who wants a rematch', () => {
    render(<DuelNotification classroomId="c1" />);
    act(() => offered?.(OFFER));

    expect(screen.getByTestId('duel-rematch-offer')).toHaveTextContent(
      'education.duels.rematchWants:Maya'
    );
  });

  it('accepting from the lobby matches the same pact the podium would', () => {
    render(<DuelNotification classroomId="c1" />);
    act(() => offered?.(OFFER));

    fireEvent.click(screen.getByTestId('duel-rematch-offer-accept'));

    expect(emit).toHaveBeenCalledWith('duel:rematch', {
      opponentId: 'opponent-1',
      lessonId: 'lesson-1',
      duelId: 'duel-1',
    });
  });

  it('takes both students to the duel the server then creates', () => {
    render(<DuelNotification classroomId="c1" />);
    act(() => offered?.(OFFER));
    fireEvent.click(screen.getByTestId('duel-rematch-offer-accept'));

    act(() => created?.({ duelId: 'duel-2', isRematch: true }));

    expect(mockPush).toHaveBeenCalledWith('/en/education/duels/duel-2');
  });

  it('drops the offer when the other student withdraws it', () => {
    render(<DuelNotification classroomId="c1" />);
    act(() => offered?.(OFFER));
    act(() => withdrawn?.({ fromUserId: 'opponent-1' }));

    expect(screen.queryByTestId('duel-rematch-offer')).not.toBeInTheDocument();
  });

  it('gives every control on the toast a real border', () => {
    render(<DuelNotification classroomId="c1" />);
    act(() => offered?.(OFFER));

    expect(screen.getByTestId('duel-rematch-offer-accept').className).toContain('border-[3px]');
    expect(screen.getByTestId('duel-rematch-offer-dismiss').className).toContain('border-[2px]');
  });
});
