// @ts-nocheck
/**
 * The server's lobby roster is every socket in the classroom room — including
 * this student's own. Rendering it unfiltered offered "challenge yourself" as
 * a tile, which is a dead end and one more thing to read before the real
 * opponent (decision fatigue). The client owns the exclusion.
 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import DuelLobby from '../DuelLobby';
import { useDuelSocket } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent } from '@/lib/supabase/education/duels';

vi.mock('@/hooks/useDuelSocket');
vi.mock('@/lib/supabase/education/duels', () => ({
  getPendingDuelsForStudent: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    dir: 'ltr',
    t: (key: string, _f?: string, p?: Record<string, unknown>) =>
      p ? `${key} ${Object.values(p).join(' ')}` : key,
  }),
}));
vi.mock('framer-motion', () => ({
  m: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const props = {
  classroomId: 'classroom-1',
  studentId: 'student-1',
  lessons: [{ id: 'lesson-1', name: 'Unit 3 verbs' }],
};

let lobbyUpdate: ((data: any) => void) | null = null;

function mountWithRoster(roster: Array<{ userId: string; displayName: string }>) {
  render(<DuelLobby {...props} />);
  act(() => {
    lobbyUpdate?.({
      availableOpponents: roster.map((r) => ({ ...r, socketId: `s-${r.userId}` })),
    });
  });
}

describe('DuelLobby — the roster never offers you yourself', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    lobbyUpdate = null;
    useDuelSocket.mockReturnValue({
      joinLobby: vi.fn(),
      leaveLobby: vi.fn(),
      acceptChallenge: vi.fn(),
      declineChallenge: vi.fn(),
      sendTaunt: vi.fn(),
      onLobbyUpdate: vi.fn((cb) => {
        lobbyUpdate = cb;
        return () => {};
      }),
      onChallengeReceived: vi.fn(() => () => {}),
      onTauntReceived: vi.fn(() => () => {}),
    });
    getPendingDuelsForStudent.mockResolvedValue({ data: [], error: null });
  });

  it('drops this student from the available-opponents grid', async () => {
    mountWithRoster([
      { userId: 'student-1', displayName: 'Student S1' },
      { userId: 'student-2', displayName: 'Student S2' },
    ]);

    await waitFor(() => expect(screen.getByText('Student S2')).toBeInTheDocument());
    expect(screen.queryByText('Student S1')).not.toBeInTheDocument();
  });

  /**
   * `duel:lobby-update` is two events wearing one name: the lobby handler sends
   * `{ availableOpponents }`, while lifecycle.ts announces a new challenge with
   * `{ action, duelId }` and no roster at all (recurring-pitfalls Class 3).
   * Taking that second payload at face value set the roster to `undefined` and
   * the next render threw — the challenged student's whole lobby fell into the
   * error boundary the moment a challenge arrived.
   */
  it('ignores the roster-less variant of the same event', async () => {
    mountWithRoster([
      { userId: 'student-1', displayName: 'Student S1' },
      { userId: 'student-2', displayName: 'Student S2' },
    ]);
    await waitFor(() => expect(screen.getByText('Student S2')).toBeInTheDocument());

    act(() => {
      lobbyUpdate?.({ action: 'challenge-created', duelId: 'duel-9' });
    });

    // still standing, still showing the classmate
    expect(screen.getByText('Student S2')).toBeInTheDocument();
  });

  it('reads as an empty lobby when this student is the only one online', async () => {
    mountWithRoster([{ userId: 'student-1', displayName: 'Student S1' }]);

    await waitFor(() =>
      expect(screen.getByText('education.duels.noClassmatesOnline')).toBeInTheDocument()
    );
  });
});
