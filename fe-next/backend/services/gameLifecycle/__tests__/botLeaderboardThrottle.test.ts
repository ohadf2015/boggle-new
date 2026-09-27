/**
 * Bot leaderboard broadcast throttling.
 *
 * Each bot word used to emit a full, UNTHROTTLED `updateLeaderboard` broadcast
 * (the heaviest MP payload). With 3 bots finding words several times/sec this
 * floods the room — the residual "MP classic feels stuck on the frontend"
 * volume the client must JSON-parse + dispatch. Humans never emit a per-word
 * leaderboard. The bot path must route through the SHARED throttled broadcaster
 * (per-gameCode, ~500ms leading+trailing edge) so it can't out-broadcast humans.
 */
import { vi, type Mock } from 'vitest';
import type { Server } from 'socket.io';

vi.mock('../../../modules/gameStateManager', () => ({
  getLeaderboard: vi.fn(() => []),
  getLeaderboardThrottled: vi.fn(),
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `room:${code}`),
}));

import { emitBotLeaderboard } from '../botGame';
import { getLeaderboard, getLeaderboardThrottled } from '../../../modules/gameStateManager';
import { volatileBroadcastToRoom } from '../../../utils/socketHelpers';

const io = {} as Server;

describe('emitBotLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes the bot leaderboard broadcast through the throttled path', () => {
    emitBotLeaderboard(io, 'GAME1');

    // Relies on the throttled wrapper's default ~500ms cadence (shared with the
    // human leaderboard path), so only gameCode + broadcast fn are passed.
    expect(getLeaderboardThrottled).toHaveBeenCalledWith(
      'GAME1',
      expect.any(Function),
    );
  });

  it('does NOT emit a raw, unthrottled updateLeaderboard per call', () => {
    emitBotLeaderboard(io, 'GAME1');

    // The unthrottled getLeaderboard + direct broadcast pair must be gone.
    expect(getLeaderboard).not.toHaveBeenCalled();
    expect(volatileBroadcastToRoom).not.toHaveBeenCalled();
  });

  it('the throttled broadcast callback emits updateLeaderboard to the game room', () => {
    emitBotLeaderboard(io, 'GAME1');

    // Invoke the broadcast fn the throttler would call on the leading edge.
    const broadcastFn = (getLeaderboardThrottled as Mock).mock.calls[0][1] as (
      lb: unknown[],
    ) => void;
    broadcastFn([{ username: 'Bot1', score: 10 }]);

    expect(volatileBroadcastToRoom).toHaveBeenCalledWith(
      io,
      'room:GAME1',
      'updateLeaderboard',
      { leaderboard: [{ username: 'Bot1', score: 10 }] },
    );
  });
});
