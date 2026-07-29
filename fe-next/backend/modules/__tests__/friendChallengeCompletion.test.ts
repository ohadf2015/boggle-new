/**
 * processFriendChallengeCompletion — auto-broadcast result when a multiplayer
 * game tied to an accepted friend_challenges row finishes. Closes the loop so
 * the OTHER party sees the result and gets a push notification.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { supabaseMock, broadcastToUserMock, notifyChallengeResultMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
  broadcastToUserMock: vi.fn(),
  notifyChallengeResultMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../supabaseServer', () => ({
  getSupabase: () => supabaseMock,
  isSupabaseConfigured: () => true,
}));
vi.mock('../../utils/socialHelpers', () => ({
  broadcastToUser: broadcastToUserMock,
  getAuthUserId: vi.fn(),
  getUserProfile: vi.fn(),
}));
vi.mock('../pushNotificationTriggers', () => ({
  notifyChallengeResult: notifyChallengeResultMock,
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { processFriendChallengeCompletion } from '../friendsChallenges';

type Row = { id: string; challenger_id: string; challenged_id: string; status: string };

function buildSelectChain(row: Row | null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
    update: vi.fn().mockReturnThis(),
  };
}

describe('processFriendChallengeCompletion', () => {
  const fakeIo = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no accepted challenge matches gameCode', async () => {
    supabaseMock.from.mockImplementation(() => buildSelectChain(null));
    const game = {
      users: {
        alice: { authUserId: 'u-a', socketId: 's1' },
        bob: { authUserId: 'u-b', socketId: 's2' },
      },
      playerScores: { alice: 100, bob: 80 },
    };
    await processFriendChallengeCompletion(fakeIo, 'NOROOM', game as never);
    expect(broadcastToUserMock).not.toHaveBeenCalled();
    expect(notifyChallengeResultMock).not.toHaveBeenCalled();
  });

  it('broadcasts friends:challengeResult to both players and pushes to both', async () => {
    const row: Row = {
      id: 'challenge-1',
      challenger_id: 'u-a',
      challenged_id: 'u-b',
      status: 'accepted',
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const selectChain = buildSelectChain(row);
    supabaseMock.from
      .mockImplementationOnce(() => selectChain)
      .mockImplementationOnce(() => updateChain);

    const game = {
      users: {
        alice: { authUserId: 'u-a', socketId: 's1', username: 'alice' },
        bob: { authUserId: 'u-b', socketId: 's2', username: 'bob' },
      },
      playerScores: { alice: 100, bob: 80 },
    };

    await processFriendChallengeCompletion(fakeIo, 'GAME-1', game as never);

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
    expect(broadcastToUserMock).toHaveBeenCalledWith(
      fakeIo,
      'u-a',
      'friends:challengeResult',
      expect.objectContaining({
        challengeId: 'challenge-1',
        winnerUserId: 'u-a',
        scores: expect.objectContaining({ 'u-a': 100, 'u-b': 80 }),
      }),
    );
    expect(broadcastToUserMock).toHaveBeenCalledWith(
      fakeIo,
      'u-b',
      'friends:challengeResult',
      expect.objectContaining({ challengeId: 'challenge-1', winnerUserId: 'u-a' }),
    );
    expect(notifyChallengeResultMock).toHaveBeenCalledTimes(2);
  });

  it('marks tie when scores are equal (winnerUserId null)', async () => {
    const row: Row = {
      id: 'challenge-tie',
      challenger_id: 'u-a',
      challenged_id: 'u-b',
      status: 'accepted',
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabaseMock.from
      .mockImplementationOnce(() => buildSelectChain(row))
      .mockImplementationOnce(() => updateChain);

    const game = {
      users: {
        alice: { authUserId: 'u-a', socketId: 's1', username: 'alice' },
        bob: { authUserId: 'u-b', socketId: 's2', username: 'bob' },
      },
      playerScores: { alice: 50, bob: 50 },
    };

    await processFriendChallengeCompletion(fakeIo, 'GAME-2', game as never);
    const payload = broadcastToUserMock.mock.calls[0][3];
    expect(payload.winnerUserId).toBeNull();
  });

  it('skips bots when computing scores', async () => {
    const row: Row = {
      id: 'challenge-bot',
      challenger_id: 'u-a',
      challenged_id: 'u-b',
      status: 'accepted',
    };
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    supabaseMock.from
      .mockImplementationOnce(() => buildSelectChain(row))
      .mockImplementationOnce(() => updateChain);

    const game = {
      users: {
        alice: { authUserId: 'u-a', socketId: 's1', username: 'alice' },
        bob: { authUserId: 'u-b', socketId: 's2', username: 'bob' },
        botBert: { authUserId: null, socketId: 's3', username: 'botBert', isBot: true },
      },
      playerScores: { alice: 70, bob: 60, botBert: 999 },
    };

    await processFriendChallengeCompletion(fakeIo, 'GAME-3', game as never);
    const payload = broadcastToUserMock.mock.calls[0][3];
    expect(payload.scores).toEqual({ 'u-a': 70, 'u-b': 60 });
    expect(payload.winnerUserId).toBe('u-a');
  });
});
