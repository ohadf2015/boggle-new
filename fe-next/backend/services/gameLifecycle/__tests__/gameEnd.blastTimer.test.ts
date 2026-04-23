/**
 * L1: endGame must clear any pending `blastEnd:<gameCode>` timer so a
 * scheduled final-wave trigger cannot invoke endGame a second time after
 * another path (human word or bot word) already ended the game.
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

describe('endGame — pending blastEnd timer cleanup (L1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transitionGameState.mockReturnValue({ success: true });
    mocks.isSupabaseConfigured.mockReturnValue(false);
    mocks.getGame.mockReturnValue({
      gameCode: 'BLAST1',
      gameMode: 'blast',
      gameEndedAt: null,
      users: { u1: { socketId: 's1' } },
      playerScores: {},
      playerWords: {},
      letterGrid: [['A']],
    });
  });

  it('clears blastEnd:<gameCode> timer so a pending scheduled end cannot double-fire', async () => {
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    await endGame(io, 'BLAST1');

    expect(mocks.timerClearTimer).toHaveBeenCalledWith('blastEnd:BLAST1');
  });

  it('does not call clearTimer when the transition fails (early return preserved)', async () => {
    mocks.transitionGameState.mockReturnValue({ success: false, error: 'already-ended' });
    const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };

    await endGame(io, 'BLAST1');

    expect(mocks.timerClearTimer).not.toHaveBeenCalled();
  });
});
