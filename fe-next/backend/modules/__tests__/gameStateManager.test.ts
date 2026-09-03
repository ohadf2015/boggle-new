/**
 * Tests for gameStateManager — central game state coordination module.
 *
 * These are integration-style tests that exercise the real module (not mocked)
 * against its in-memory games store. Sub-module dependencies (persistence,
 * Redis, engagement timeouts) are mocked at the boundary.
 */

// Mock logger before anything else
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

// Mock persistence — no Redis in unit tests
vi.mock('../gameState/persistence', () => ({
  persistGameState: vi.fn(),
  persistGameStateNow: vi.fn().mockResolvedValue(undefined),
  restoreGameFromRedis: vi.fn().mockResolvedValue(null),
  restoreAllGamesFromRedis: vi.fn().mockResolvedValue(0),
  getAllGameCodesFromRedis: vi.fn().mockResolvedValue([]),
  deleteGameFromRedis: vi.fn(),
  clearPersistTimer: vi.fn(),
}));

// Mock engagement timeout cleanup
vi.mock('../../services/gameLifecycle/gameResults', () => ({
  clearEngagementTimeouts: vi.fn(),
}));

 
import { vi, type Mock, type MockInstance } from 'vitest';
import gsm from '../gameStateManager';
function defaultCreationData(overrides: Record<string, any> = {}) {
  return {
    hostSocketId: 'socket-host',
    hostUsername: 'HostUser',
    hostPlayerId: 'host-player-id',
    roomName: 'Test Room',
    language: 'en',
    isRanked: false,
    allowLateJoin: true,
    ...overrides,
  };
}

describe('gameStateManager', () => {
  afterEach(() => {
    // Clean up all games between tests
    gsm.clearAllGames();
  });

  // ─── Game Creation ───
  describe('createGame', () => {
    it('returns a game object with correct initial state', () => {
      const game = gsm.createGame('ROOM1', defaultCreationData());

      expect(game).toMatchObject({
        gameCode: 'ROOM1',
        hostSocketId: 'socket-host',
        hostUsername: 'HostUser',
        hostPlayerId: 'host-player-id',
        roomName: 'Test Room',
        language: 'en',
        gameState: 'waiting',
        letterGrid: null,
        timerSeconds: 180,
        tournamentId: null,
        isRanked: false,
        allowLateJoin: true,
        gameSessionId: 0,
        gameMode: 'classic',
      });
      expect(game.users).toEqual({});
      expect(game.spectators).toEqual({});
      expect(game.playerScores).toEqual({});
      expect(game.playerWords).toEqual({});
      expect(game.createdAt).toBeGreaterThan(0);
      expect(game.lastActivity).toBeGreaterThan(0);
    });

    it('uses defaults for optional fields', () => {
      const game = gsm.createGame('ROOM2', {
        hostSocketId: 's1',
        hostUsername: 'H',
        hostPlayerId: 'hp',
      });

      expect(game.language).toBe('en');
      expect(game.roomName).toBe('ROOM2'); // falls back to gameCode
      expect(game.isRanked).toBe(false);
      expect(game.allowLateJoin).toBe(true);
    });
  });

  // ─── getGame / gameExists / deleteGame ───
  describe('getGame / gameExists / deleteGame', () => {
    it('getGame returns null for non-existent game', () => {
      expect(gsm.getGame('NOPE')).toBeNull();
    });

    it('getGame returns the game after creation', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.getGame('G1')).not.toBeNull();
      expect(gsm.getGame('G1').gameCode).toBe('G1');
    });

    it('gameExists returns true/false correctly', () => {
      expect(gsm.gameExists('G1')).toBe(false);
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.gameExists('G1')).toBe(true);
    });

    it('deleteGame removes the game', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.deleteGame('G1');
      expect(gsm.getGame('G1')).toBeNull();
      expect(gsm.gameExists('G1')).toBe(false);
    });

    it('deleteGame on non-existent game is a no-op', () => {
      expect(() => gsm.deleteGame('NOPE')).not.toThrow();
    });
  });

  // ─── getAllGameCodes / getGameCount ───
  describe('getAllGameCodes / getGameCount', () => {
    it('returns empty when no games exist', () => {
      expect(gsm.getAllGameCodes()).toEqual([]);
      expect(gsm.getGameCount()).toBe(0);
    });

    it('returns correct codes and count after creating games', () => {
      gsm.createGame('A', defaultCreationData());
      gsm.createGame('B', defaultCreationData());
      expect(gsm.getGameCount()).toBe(2);
      expect(gsm.getAllGameCodes().sort()).toEqual(['A', 'B']);
    });
  });

  // ─── updateGame ───
  describe('updateGame', () => {
    it('merges partial updates into game', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.updateGame('G1', { language: 'he', timerSeconds: 120 });

      const game = gsm.getGame('G1');
      expect(game.language).toBe('he');
      expect(game.timerSeconds).toBe(120);
    });

    it('updates lastActivity', () => {
      gsm.createGame('G1', defaultCreationData());
      const before = gsm.getGame('G1').lastActivity;
      gsm.updateGame('G1', { language: 'sv' });
      expect(gsm.getGame('G1').lastActivity).toBeGreaterThanOrEqual(before);
    });

    it('is a no-op for non-existent game', () => {
      expect(() => gsm.updateGame('NOPE', { language: 'ja' })).not.toThrow();
    });
  });

  // ─── Player Management ───
  describe('addUserToGame / removeUserFromGame', () => {
    it('adds a user and retrieves them via getGameUsers', () => {
      gsm.createGame('G1', defaultCreationData());
      const added = gsm.addUserToGame('G1', 'Player1', 'sock-p1');
      expect(added).toBe(true);

      const users = gsm.getGameUsers('G1');
      expect(users.length).toBe(1);
      expect(users[0].username).toBe('Player1');
    });

    it('removes a user', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'Player1', 'sock-p1');
      gsm.removeUserFromGame('G1', 'Player1');

      const users = gsm.getGameUsers('G1');
      expect(users.length).toBe(0);
    });

    it('returns false when adding to non-existent game', () => {
      const result = gsm.addUserToGame('NOPE', 'Player1', 'sock-p1');
      expect(result).toBe(false);
    });

    it('can add multiple users', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.addUserToGame('G1', 'P2', 's2');
      gsm.addUserToGame('G1', 'P3', 's3');

      expect(gsm.getGameUsers('G1').length).toBe(3);
    });
  });

  // ─── State Transitions ───
  describe('transitionGameState', () => {
    it('transitions waiting -> in-progress via START', () => {
      gsm.createGame('G1', defaultCreationData());
      const result = gsm.transitionGameState('G1', 'START');

      expect(result.success).toBe(true);
      expect(result.previousState).toBe('waiting');
      expect(result.newState).toBe('in-progress');
      expect(gsm.getGame('G1').gameState).toBe('in-progress');
    });

    it('transitions in-progress -> finished via END', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      const result = gsm.transitionGameState('G1', 'END');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('finished');
    });

    it('transitions finished -> waiting via RESET', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.transitionGameState('G1', 'END');
      const result = gsm.transitionGameState('G1', 'RESET');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('waiting');
    });

    it('rejects invalid transition', () => {
      gsm.createGame('G1', defaultCreationData());
      // waiting -> END is invalid
      const result = gsm.transitionGameState('G1', 'END');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns error for non-existent game', () => {
      const result = gsm.transitionGameState('NOPE', 'START');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('full lifecycle: waiting -> in-progress -> finished -> validating -> waiting', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.transitionGameState('G1', 'START').success).toBe(true);
      expect(gsm.transitionGameState('G1', 'TIMEOUT').success).toBe(true);
      expect(gsm.transitionGameState('G1', 'VALIDATE').success).toBe(true);
      expect(gsm.getGame('G1').gameState).toBe('validating');
      expect(gsm.transitionGameState('G1', 'VALIDATION_COMPLETE').success).toBe(true);
      expect(gsm.getGame('G1').gameState).toBe('waiting');
    });
  });

  // ─── canTransitionGameState / getValidGameEvents ───
  describe('canTransitionGameState / getValidGameEvents', () => {
    it('canTransition returns true for valid event', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.canTransitionGameState('G1', 'START')).toBe(true);
    });

    it('canTransition returns false for invalid event', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.canTransitionGameState('G1', 'END')).toBe(false);
    });

    it('canTransition returns false for non-existent game', () => {
      expect(gsm.canTransitionGameState('NOPE', 'START')).toBe(false);
    });

    it('getValidGameEvents returns correct events for waiting', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.getValidGameEvents('G1')).toEqual(['START']);
    });

    it('getValidGameEvents returns empty for non-existent game', () => {
      expect(gsm.getValidGameEvents('NOPE')).toEqual([]);
    });
  });

  // ─── resetGameForNewRound ───
  describe('resetGameForNewRound', () => {
    it('resets per-round state while preserving room-level state', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.transitionGameState('G1', 'START');

      // Simulate some round data
      gsm.updateGame('G1', {
        letterGrid: [['A', 'B'], ['C', 'D']],
        earthquakeTriggered: true,
      });
      gsm.updatePlayerScore('G1', 'P1', 100);
      gsm.transitionGameState('G1', 'END');

      const result = gsm.resetGameForNewRound('G1');
      expect(result).toBe(true);

      const game = gsm.getGame('G1');
      // Per-round state cleared
      expect(game.letterGrid).toBeNull();
      expect(game.earthquakeTriggered).toBe(false);
      expect(game.gameState).toBe('waiting');
      expect(game.gameSessionId).toBe(1);

      // Room-level state preserved
      expect(game.hostSocketId).toBe('socket-host');
      expect(game.roomName).toBe('Test Room');
      expect(game.language).toBe('en');
    });

    it('returns false for non-existent game', () => {
      expect(gsm.resetGameForNewRound('NOPE')).toBe(false);
    });

    it('clears stale wheelRushState so a reconnect during the between-rounds window cannot rehydrate the prior round', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', {
        wheelRushState: {
          puzzle: { centerLetter: 'A', outerLetters: ['B'], allLetters: ['A', 'B'] },
          foundWords: { P1: ['AB'] },
          firstFinders: { AB: 'P1' },
          startedAt: Date.now(),
        },
      });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').wheelRushState).toBeNull();
    });

    it('increments gameSessionId each reset', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.transitionGameState('G1', 'END');
      gsm.resetGameForNewRound('G1');
      expect(gsm.getGame('G1').gameSessionId).toBe(1);

      gsm.transitionGameState('G1', 'START');
      gsm.transitionGameState('G1', 'END');
      gsm.resetGameForNewRound('G1');
      expect(gsm.getGame('G1').gameSessionId).toBe(2);
    });

    // ─── Cross-round carryover (recurring pitfall Class 2) ───
    // Every one of these fields is written behind a MODE branch at round start
    // (`resolvedMode === 'classic' && players >= 2` for the round-event/rush pair,
    // `=== 'word-tower'` for the versus match, a best-effort async IIFE for
    // specialWords) or only by a timer that the game-end sweep cancels
    // (`fireRoundActive`). A round that ends mid-effect therefore leaves the flag
    // set, and the next round — in a mode whose start path never re-initialises it —
    // scores against last round's state. The reset must be unconditional.
    it('clears fireRoundActive so a round ending mid-fire-round does not 2x the next round', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      // Earthquake's fire round is live; its `fireEnd` timer is cancelled by the
      // game-end sweep before it can flip the flag back.
      gsm.updateGame('G1', { fireRoundActive: true });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').fireRoundActive).toBe(false);
    });

    it('clears the round-event schedule so a stale lightning event cannot score the next round', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', {
        activeRoundEvent: 'lightning',
        roundEventSchedule: { eventType: 'lightning', triggerAtPercent: 0.5 },
      });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      const game = gsm.getGame('G1');
      expect(game.activeRoundEvent).toBeNull();
      expect(game.roundEventSchedule).toBeNull();
    });

    it('clears rush tiles so last round\'s tile positions cannot bonus the new grid', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', {
        rushTiles: [{ row: 0, col: 1 }],
        rushTilesActive: true,
      });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      const game = gsm.getGame('G1');
      expect(game.rushTiles).toEqual([]);
      expect(game.rushTilesActive).toBe(false);
    });

    it('clears specialWords so an already-claimed word cannot block the next round', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', { specialWords: [{ word: 'PUZZLE', foundBy: 'P1' }] });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').specialWords).toEqual([]);
    });

    it('clears cachedResultsPayload so a reconnect cannot be served last round\'s scores', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', { cachedResultsPayload: { scores: [{ username: 'P1', totalScore: 42 }] } });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').cachedResultsPayload).toBeNull();
    });

    it('clears wordTowerVersusState alongside its blast/wheel/word-hunt siblings', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', { wordTowerVersusState: { matchId: 'm1' } });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').wordTowerVersusState).toBeNull();
    });

    it('clears playerBoosts so a boost bought for one round does not re-apply free every round after', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.transitionGameState('G1', 'START');
      // A boost claimed for THIS round. calculateAndBroadcastFinalScores applies
      // game.playerBoosts at the end of every round, so an uncleared claim keeps
      // paying out for the whole life of the room.
      gsm.updateGame('G1', { playerBoosts: { P1: { sessionId: 'G1', token: 'tok' } } });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').playerBoosts).toEqual({});
    });

    it('clears totalBoardWords so the next round cannot report a stale board count', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.updateGame('G1', { totalBoardWords: 137 });
      gsm.transitionGameState('G1', 'END');

      gsm.resetGameForNewRound('G1');

      expect(gsm.getGame('G1').totalBoardWords).toBe(0);
    });

    it('works from waiting state (no-op transition)', () => {
      gsm.createGame('G1', defaultCreationData());
      const result = gsm.resetGameForNewRound('G1');
      expect(result).toBe(true);
      expect(gsm.getGame('G1').gameState).toBe('waiting');
    });

    it('works from validating state', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      gsm.transitionGameState('G1', 'END');
      gsm.transitionGameState('G1', 'VALIDATE');
      expect(gsm.getGame('G1').gameState).toBe('validating');

      const result = gsm.resetGameForNewRound('G1');
      expect(result).toBe(true);
      expect(gsm.getGame('G1').gameState).toBe('waiting');
    });

    it('force-resets from unexpected state (in-progress)', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.transitionGameState('G1', 'START');
      // Reset while in-progress (unexpected but handled)
      const result = gsm.resetGameForNewRound('G1');
      expect(result).toBe(true);
      expect(gsm.getGame('G1').gameState).toBe('waiting');
    });
  });

  // ─── Score / Word Tracking ───
  describe('score and word tracking', () => {
    beforeEach(() => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
    });

    it('updatePlayerScore sets absolute score', () => {
      gsm.updatePlayerScore('G1', 'P1', 50);
      const users = gsm.getGameUsers('G1');
      expect(users[0].score).toBe(50);
    });

    it('updatePlayerScore with isDelta adds to existing score', () => {
      gsm.updatePlayerScore('G1', 'P1', 50);
      gsm.updatePlayerScore('G1', 'P1', 25, true);
      const users = gsm.getGameUsers('G1');
      expect(users[0].score).toBe(75);
    });

    it('addPlayerWord and playerHasWord', () => {
      gsm.addPlayerWord('G1', 'P1', 'hello');
      expect(gsm.playerHasWord('G1', 'P1', 'hello')).toBe(true);
      expect(gsm.playerHasWord('G1', 'P1', 'world')).toBe(false);
    });
  });

  // ─── Host Management ───
  describe('host management', () => {
    it('isHost returns true for host socket', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'HostUser', 'socket-host', { isHost: true });
      expect(gsm.isHost('socket-host')).toBe(true);
    });

    it('updateHostSocketId changes the host socket', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'HostUser', 'socket-host', { isHost: true });
      gsm.updateHostSocketId('G1', 'new-socket');
      expect(gsm.getGame('G1').hostSocketId).toBe('new-socket');
    });
  });

  // ─── Spectator Management ───
  describe('spectator management', () => {
    it('adds and removes spectators', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addSpectatorToGame('G1', 'Spectator1', 'spec-sock');
      expect(gsm.isSpectator('G1', 'Spectator1')).toBe(true);

      gsm.removeSpectatorFromGame('G1', 'Spectator1');
      expect(gsm.isSpectator('G1', 'Spectator1')).toBe(false);
    });

    it('upgradeSpectatorToPlayer fails when game is not in waiting state', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addSpectatorToGame('G1', 'Spec1', 'spec-sock');
      gsm.transitionGameState('G1', 'START');

      const result = gsm.upgradeSpectatorToPlayer('G1', 'Spec1');
      expect(result).toBe(false);
    });
  });

  // ─── Ready State ───
  describe('ready state management', () => {
    it('marks player ready and gets count', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.addUserToGame('G1', 'P2', 's2');

      gsm.markPlayerReadyForNextGame('G1', 'P1');
      expect(gsm.isPlayerReadyForNextGame('G1', 'P1')).toBe(true);
      expect(gsm.isPlayerReadyForNextGame('G1', 'P2')).toBe(false);

      const count = gsm.getPlayersReadyCount('G1');
      expect(count.readyCount).toBe(1);
    });

    it('clearPlayersReadyForNextGame resets ready state', () => {
      gsm.createGame('G1', defaultCreationData());
      gsm.addUserToGame('G1', 'P1', 's1');
      gsm.markPlayerReadyForNextGame('G1', 'P1');
      gsm.clearPlayersReadyForNextGame('G1');
      expect(gsm.isPlayerReadyForNextGame('G1', 'P1')).toBe(false);
    });
  });

  // ─── forEachGame ───
  describe('forEachGame', () => {
    it('iterates all games', () => {
      gsm.createGame('A', defaultCreationData());
      gsm.createGame('B', defaultCreationData());

      const codes: string[] = [];
      gsm.forEachGame((code: string) => codes.push(code));
      expect(codes.sort()).toEqual(['A', 'B']);
    });
  });

  // ─── clearAllGames ───
  describe('clearAllGames', () => {
    it('removes all games and returns count', () => {
      gsm.createGame('A', defaultCreationData());
      gsm.createGame('B', defaultCreationData());
      gsm.createGame('C', defaultCreationData());

      const count = gsm.clearAllGames();
      expect(count).toBe(3);
      expect(gsm.getGameCount()).toBe(0);
    });
  });

  // ─── Tournament ───
  describe('tournament management', () => {
    it('sets and gets tournament id', () => {
      gsm.createGame('G1', defaultCreationData());
      expect(gsm.getTournamentIdFromGame('G1')).toBeNull();

      gsm.setTournamentIdForGame('G1', 'tourney-123');
      expect(gsm.getTournamentIdFromGame('G1')).toBe('tourney-123');
    });
  });

  // ─── Private Rooms ───
  describe('private rooms', () => {
    it('creates a game with isPrivate defaulting to false', () => {
      const game = gsm.createGame('PUB1', defaultCreationData());
      expect(game.isPrivate).toBe(false);
    });

    it('creates a private game when isPrivate is true', () => {
      const game = gsm.createGame('PRIV1', defaultCreationData({ isPrivate: true }));
      expect(game.isPrivate).toBe(true);
    });

    it('excludes private rooms from getActiveRooms', () => {
      // Create a public room with a human player
      gsm.createGame('PUB1', defaultCreationData());
      gsm.addUserToGame('PUB1', 'Player1', 'sock-1');

      // Create a private room with a human player
      gsm.createGame('PRIV1', defaultCreationData({ isPrivate: true }));
      gsm.addUserToGame('PRIV1', 'Player2', 'sock-2');

      const activeRooms = gsm.getActiveRooms();
      const codes = activeRooms.map((r: { gameCode: string }) => r.gameCode);

      expect(codes).toContain('PUB1');
      expect(codes).not.toContain('PRIV1');
    });

    it('includes private rooms in getDetailedGames (admin view)', () => {
      gsm.createGame('PUB1', defaultCreationData());
      gsm.addUserToGame('PUB1', 'Player1', 'sock-1');

      gsm.createGame('PRIV1', defaultCreationData({ isPrivate: true }));
      gsm.addUserToGame('PRIV1', 'Player2', 'sock-2');

      const detailed = gsm.getDetailedGames();
      const codes = detailed.map((r: { gameCode: string }) => r.gameCode);

      expect(codes).toContain('PUB1');
      expect(codes).toContain('PRIV1');

      const privRoom = detailed.find((r: { gameCode: string }) => r.gameCode === 'PRIV1');
      expect(privRoom?.isPrivate).toBe(true);
    });
  });
});
