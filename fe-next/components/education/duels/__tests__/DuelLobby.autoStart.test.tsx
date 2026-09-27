// @ts-nocheck
/**
 * The challenger never got into their own duel.
 *
 * Accepting pushes the ACCEPTOR to /education/duels/[id]. The challenger is
 * still on the lobby: their socket is put in the duel room and receives
 * `duel:started`, but the lobby had no listener for it, so the screen simply
 * did not react. They watched the lobby while the duel they started ran out its
 * clock (recurring-pitfalls Class 4 — an event delivered to nobody).
 */
import React from 'react';
import { render, act, waitFor, screen } from '@testing-library/react';
import DuelLobby from '../DuelLobby';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent } from '@/lib/supabase/education/duels';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/hooks/useDuelSocket');
vi.mock('@/lib/supabase/education/duels', () => ({ getPendingDuelsForStudent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key) => key }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

describe('DuelLobby — the challenger follows their own duel', () => {
  let started = null;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    started = null;
    useDuelSocket.mockReturnValue({
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      sendTaunt: vi.fn(),
      onLobbyUpdate: vi.fn(() => () => {}),
      onChallengeReceived: vi.fn(() => () => {}),
      onTauntReceived: vi.fn(() => () => {}),
      onDuelStarted: vi.fn((cb) => {
        started = cb;
        return () => {};
      }),
    });
    getPendingDuelsForStudent.mockResolvedValue({ data: [], error: null });
  });

  it('navigates to the duel when the opponent accepts', async () => {
    render(<DuelLobby classroomId="classroom-1" studentId="student-1" lessons={[]} />);
    await waitFor(() => expect(started).toBeTypeOf('function'));

    act(() => started({ duelId: 'duel-7', boardState: [], startTime: '', timeLimit: 180 }));

    expect(push).toHaveBeenCalledWith('/en/education/duels/duel-7');
  });

  it('ignores a start with no duel id rather than navigating nowhere', async () => {
    render(<DuelLobby classroomId="classroom-1" studentId="student-1" lessons={[]} />);
    await waitFor(() => expect(started).toBeTypeOf('function'));

    act(() => started({ boardState: [], startTime: '', timeLimit: 180 }));

    expect(push).not.toHaveBeenCalled();
  });
});
