import { vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  transitionGameState: vi.fn((): { success: boolean; error?: string } => ({ success: true })),
  collectNonDictionaryWords: vi.fn(() => []),
  getWordsForPlayer: vi.fn(() => []),
  cleanupGameTracking: vi.fn(),
  broadcastToRoom: vi.fn(),
  getGameRoom: (c: string) => `room:${c}`,
  getSocketById: vi.fn(),
  safeEmit: vi.fn(),
  timerSetTimeout: vi.fn(),
  timerClearTimer: vi.fn(),
  clearGameTimer: vi.fn(),
  stopAllBots: vi.fn(),
  clearBotScoringStart: vi.fn(),
  clearBotVariance: vi.fn(),
  emitGameEnd: vi.fn(),
  calculateAndBroadcastFinalScores: vi.fn(async () => {}),
  recordGameResultsToSupabase: vi.fn(async () => {}),
  isSupabaseConfigured: vi.fn(() => false),
  handlePeerValidation: vi.fn(),
  handleTournamentCompletion: vi.fn(),
}));

vi.mock('../../../modules/gameStateManager', () => ({
  getGame: mocks.getGame,
  transitionGameState: mocks.transitionGameState,
}));

vi.mock('../../../modules/communityWordManager', () => ({
  collectNonDictionaryWords: mocks.collectNonDictionaryWords,
  getWordsForPlayer: mocks.getWordsForPlayer,
  SELF_HEALING_CONFIG: { WORDS_PER_PLAYER: 1 },
  cleanupGameTracking: mocks.cleanupGameTracking,
}));

vi.mock('../../../utils/socketHelpers', () => ({
  broadcastToRoom: mocks.broadcastToRoom,
  getGameRoom: mocks.getGameRoom,
  getSocketById: mocks.getSocketById,
  safeEmit: mocks.safeEmit,
}));

vi.mock('../../../utils/timerManager', () => ({
  default: { setTimeout: mocks.timerSetTimeout, clearTimer: mocks.timerClearTimer },
  clearGameTimer: mocks.clearGameTimer,
}));

vi.mock('../../../modules/botManager', () => ({
  stopAllBots: mocks.stopAllBots,
}));

vi.mock('../botGame', () => ({
  clearBotScoringStart: mocks.clearBotScoringStart,
  clearBotVariance: mocks.clearBotVariance,
}));

vi.mock('../../../events/gameCleanup', () => ({
  gameCleanupEmitter: { emitGameEnd: mocks.emitGameEnd },
}));

vi.mock('../gameScores', () => ({
  calculateAndBroadcastFinalScores: mocks.calculateAndBroadcastFinalScores,
}));

vi.mock('../gameResults', () => ({
  recordGameResultsToSupabase: mocks.recordGameResultsToSupabase,
}));

vi.mock('../../../modules/supabaseServer', () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock('../peerValidation', () => ({
  handlePeerValidation: mocks.handlePeerValidation,
}));

vi.mock('../tournamentEnd', () => ({
  handleTournamentCompletion: mocks.handleTournamentCompletion,
}));

vi.mock('../../../utils/logger', () => ({ default: {
  info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
} }));

import { endGame } from '../gameEnd';

describe('endGame — idempotent once the round is finished', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(false);
  });

  function inProgressGame(): any {
    const game: any = {
      gameCode: 'IDEM1', gameMode: 'classic', gameState: 'in-progress', gameEndedAt: null,
      users: {}, playerScores: {}, playerWords: {}, letterGrid: [['A']],
    };
    mocks.getGame.mockReturnValue(game);
    mocks.transitionGameState.mockImplementation(() => {
      game.gameState = 'finished';
      return { success: true };
    });
    return game;
  }

  it('scores, broadcasts and runs post-game work only once when called twice', async () => {
    inProgressGame();
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    await endGame(io, 'IDEM1');
    await endGame(io, 'IDEM1');

    expect(mocks.calculateAndBroadcastFinalScores).toHaveBeenCalledTimes(1);
    expect(mocks.handleTournamentCompletion).toHaveBeenCalledTimes(1);
    expect(mocks.transitionGameState).toHaveBeenCalledTimes(1);
  });

  it('keeps the first gameEndedAt so the grace window is not restarted or wiped', async () => {
    const game = inProgressGame();
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    await endGame(io, 'IDEM1');
    const firstEndedAt = game.gameEndedAt;
    await new Promise((r) => setTimeout(r, 5));
    await endGame(io, 'IDEM1');

    expect(firstEndedAt).toEqual(expect.any(Number));
    expect(game.gameEndedAt).toBe(firstEndedAt);
  });

  it('does nothing for a room still in the lobby', async () => {
    const game = inProgressGame();
    game.gameState = 'waiting';

    await endGame({ to: vi.fn().mockReturnThis(), emit: vi.fn() } as any, 'IDEM1');

    expect(mocks.transitionGameState).not.toHaveBeenCalled();
    expect(game.gameEndedAt).toBeNull();
  });

  it('re-sends the cached results to a late end request instead of re-scoring', async () => {
    const game = inProgressGame();
    game.gameState = 'finished';
    game.cachedResultsPayload = { scores: [{ username: 'a', score: 5 }] };

    await endGame({ to: vi.fn().mockReturnThis(), emit: vi.fn() } as any, 'IDEM1');

    expect(mocks.calculateAndBroadcastFinalScores).not.toHaveBeenCalled();
    expect(mocks.broadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:IDEM1', 'validatedScores', game.cachedResultsPayload);
  });
});
