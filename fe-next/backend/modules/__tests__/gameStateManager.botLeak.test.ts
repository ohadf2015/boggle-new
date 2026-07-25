/**
 * Regression: deleteGame() must release per-game bot state.
 *
 * `gameBots` (botManager) and `botIdCounters` (botCreation) are module-level
 * Maps keyed by gameCode. Eight handler sites paired `cleanupGameBots()` with
 * teardown by hand, but the two *automatic* sweeps that actually run on a
 * long-lived server — cleanupEmptyRooms() and cleanupStaleGames() — called
 * deleteGame() without it. Every abandoned room therefore retained its Bot
 * objects (each holding a word list) forever. Class-3 asymmetric path, see
 * .claude/rules/60-recurring-pitfalls.md.
 *
 * These tests drive the SWEEP path specifically: a test through a handler
 * would have passed before the fix and proven nothing.
 */

vi.mock('../supabaseServer', () => ({
  getPopularPlayerWords: vi.fn().mockResolvedValue({ data: [] }),
  getSupabase: vi.fn().mockReturnValue(null),
  incrementBotWordUsage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../boggleSolver', () => ({
  findWordsForBots: vi.fn().mockReturnValue({
    easy: ['cat', 'dog'],
    medium: ['hello', 'world'],
    hard: ['testing'],
  }),
}));

vi.mock('../../dictionary', () => ({
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

vi.mock('../gameState/persistence', () => ({
  persistGameState: vi.fn(),
  persistGameStateNow: vi.fn().mockResolvedValue(undefined),
  restoreGameFromRedis: vi.fn().mockResolvedValue(null),
  restoreAllGamesFromRedis: vi.fn().mockResolvedValue(0),
  getAllGameCodesFromRedis: vi.fn().mockResolvedValue([]),
  deleteGameFromRedis: vi.fn(),
  clearPersistTimer: vi.fn(),
}));

vi.mock('../../services/gameLifecycle/gameResults', () => ({
  clearEngagementTimeouts: vi.fn(),
}));

import { vi } from 'vitest';
import gsm from '../gameStateManager';
import { addBot, getGameBots } from '../botManager';
import {
  recordAIValidationUsed,
  getRemainingAIValidations,
  SELF_HEALING_CONFIG,
} from '../communityWordHybridValidation';

function creationData(overrides: Record<string, unknown> = {}) {
  return {
    hostSocketId: 'socket-host',
    hostUsername: 'HostUser',
    hostPlayerId: 'host-player-id',
    roomName: 'Leak Room',
    language: 'en' as const,
    isRanked: false,
    allowLateJoin: true,
    ...overrides,
  };
}

describe('deleteGame releases per-game bot state', () => {
  afterEach(() => {
    gsm.clearAllGames();
  });

  it('drops bots when a game is deleted directly', () => {
    gsm.createGame('LEAK1', creationData());
    addBot('LEAK1', 'medium');
    expect(getGameBots('LEAK1')).toHaveLength(1);

    gsm.deleteGame('LEAK1');

    expect(getGameBots('LEAK1')).toEqual([]);
  });

  it('drops bots when the stale-game sweep deletes the room', () => {
    const game = gsm.createGame('LEAK2', creationData());
    addBot('LEAK2', 'easy');
    // Age the room past the sweep threshold. Set it on the live object —
    // updateGame() refreshes lastActivity, which would undo this.
    game.lastActivity = Date.now() - 60 * 60 * 1000;

    const removed = gsm.cleanupStaleGames();

    expect(removed).toBe(1);
    expect(getGameBots('LEAK2')).toEqual([]);
  });

  it('drops the AI-validation counter when a game is deleted', () => {
    const MAX = SELF_HEALING_CONFIG.MAX_AI_VALIDATIONS_PER_GAME;
    gsm.createGame('LEAK3', creationData());
    // Seed a counter the way an in-game community-word validation would.
    recordAIValidationUsed('LEAK3');
    expect(getRemainingAIValidations('LEAK3')).toBe(MAX - 1);

    gsm.deleteGame('LEAK3');

    expect(getRemainingAIValidations('LEAK3')).toBe(MAX);
  });
});
