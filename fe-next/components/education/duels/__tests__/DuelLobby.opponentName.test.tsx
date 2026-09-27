// @ts-nocheck
/**
 * The lobby must name the classmate who challenged you, and must say when the
 * challenge is LIVE.
 *
 * Measured live 2026-09-12 (S1 → S2, capture server): the card read "YOUR MOVE
 * VS OPPONENT" for a REAL-TIME challenge. Two separate holes:
 *  - the only name source wired up was the classroom roster, which a student
 *    can read back empty with `error: null` (own-row RLS), so every card fell
 *    through to t('common.opponent');
 *  - `duel_type` never reached the card, so a live invite wore async clothes.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

const baseProps = {
  classroomId: 'classroom-1',
  studentId: 'student-1',
  lessons: [{ id: 'lesson-1', name: 'Unit 3 verbs' }],
};

function socketMock(overrides = {}) {
  return {
    joinLobby: vi.fn(),
    leaveLobby: vi.fn(),
    acceptChallenge: vi.fn(),
    declineChallenge: vi.fn(),
    sendTaunt: vi.fn(),
    onLobbyUpdate: vi.fn(() => () => {}),
    onChallengeReceived: vi.fn(() => () => {}),
    onTauntReceived: vi.fn(() => () => {}),
    onDuelStarted: vi.fn(() => () => {}),
    ...overrides,
  };
}

function pending(overrides = {}) {
  return {
    data: [
      {
        id: 'duel-1',
        challenger_id: 'challenger-1',
        lesson_id: 'lesson-1',
        challenger_score: 0,
        duel_type: 'async',
        created_at: new Date().toISOString(),
        ...overrides,
      },
    ],
    error: null,
  };
}

describe('DuelLobby — naming the challenger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useDuelSocket.mockReturnValue(socketMock());
    getPendingDuelsForStudent.mockResolvedValue(pending());
  });

  it('uses the live lobby roster when the classroom roster came back empty', async () => {
    let emitLobby: (data: unknown) => void = () => {};
    useDuelSocket.mockReturnValue(
      socketMock({
        onLobbyUpdate: vi.fn((cb) => {
          emitLobby = cb;
          return () => {};
        }),
      })
    );

    render(<DuelLobby {...baseProps} opponentNames={{}} />);
    await waitFor(() => expect(screen.getByTestId('duel-turn-card')).toBeInTheDocument());

    emitLobby({
      availableOpponents: [{ userId: 'challenger-1', displayName: 'Maya' }],
    });

    await waitFor(() =>
      expect(screen.getByTestId('duel-turn-card')).toHaveTextContent('Maya')
    );
  });

  it('remembers the name the challenge event carried across a remount', async () => {
    let emitChallenge: (data: unknown) => void = () => {};
    useDuelSocket.mockReturnValue(
      socketMock({
        onChallengeReceived: vi.fn((cb) => {
          emitChallenge = cb;
          return () => {};
        }),
      })
    );

    const { unmount } = render(<DuelLobby {...baseProps} opponentNames={{}} />);
    await waitFor(() => expect(screen.getByTestId('duel-turn-card')).toBeInTheDocument());

    emitChallenge({ duelId: 'duel-1', challengerName: 'Maya', duelType: 'async' });
    await waitFor(() =>
      expect(screen.getByTestId('duel-turn-card')).toHaveTextContent('Maya')
    );

    // A reload is exactly when the socket event is gone for good.
    unmount();
    useDuelSocket.mockReturnValue(socketMock());
    render(<DuelLobby {...baseProps} opponentNames={{}} />);

    await waitFor(() =>
      expect(screen.getByTestId('duel-turn-card')).toHaveTextContent('Maya')
    );
  });

  it('marks a real-time challenge as live', async () => {
    getPendingDuelsForStudent.mockResolvedValue(pending({ duel_type: 'realtime' }));

    render(<DuelLobby {...baseProps} opponentNames={{ 'challenger-1': 'Maya' }} />);

    await waitFor(() =>
      expect(screen.getByTestId('duel-turn-card').dataset.duelType).toBe('realtime')
    );
    expect(screen.getByTestId('duel-turn-live-badge')).toBeInTheDocument();
  });

  it('leaves an async challenge alone', async () => {
    render(<DuelLobby {...baseProps} opponentNames={{ 'challenger-1': 'Maya' }} />);

    await waitFor(() =>
      expect(screen.getByTestId('duel-turn-card').dataset.duelType).toBe('async')
    );
    expect(screen.queryByTestId('duel-turn-live-badge')).not.toBeInTheDocument();
  });
});
