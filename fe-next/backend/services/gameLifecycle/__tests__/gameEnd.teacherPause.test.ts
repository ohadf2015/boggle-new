/**
 * Teacher pause — ending the round (timer expiry OR "End round now" while
 * paused) must clear the pause flags so results/next-round flows never see a
 * stale `isPaused` (Class 2 pitfall: stale mutable state across rounds).
 */
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

describe('endGame — clears teacher pause state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transitionGameState.mockReturnValue({ success: true });
    mocks.isSupabaseConfigured.mockReturnValue(false);
  });

  it('resets isPaused / pausedRemainingMs / timerEndTimestamp when a paused round is ended', async () => {
    const game: any = {
      gameCode: 'CLS1', gameMode: 'classic', gameEndedAt: null, users: {}, playerScores: {}, playerWords: {},
      letterGrid: [['A']], isPaused: true, pausedRemainingMs: 30_000, timerEndTimestamp: 123, timerLaunchedAt: 100,
    };
    mocks.getGame.mockReturnValue(game);

    await endGame({ to: vi.fn().mockReturnThis(), emit: vi.fn() } as any, 'CLS1');

    expect(game.isPaused).toBe(false);
    expect(game.pausedRemainingMs).toBeNull();
    expect(game.timerEndTimestamp).toBeNull();
    expect(game.timerLaunchedAt).toBeNull();
  });
});
