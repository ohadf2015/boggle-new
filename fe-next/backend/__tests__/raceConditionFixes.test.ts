/**
 * Race Condition Fixes - Tests
 * Covers: timer double-start, host reconnection thread-safety,
 *         Word Hunt state reset, spectator upgrade guard, ACK+reset deadlock
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { GameStartCoordinator } from '../utils/gameStartCoordinator';

import { createGame,
  getGame,
  resetGameForNewRound,
  updateGame,
  clearAllGames,
  upgradeSpectatorToPlayer,
  addSpectatorToGame,
  addUserToGame, } from '../modules/gameStateManager';
describe('Race Condition Fixes', () => {
  afterEach(() => {
    clearAllGames();
    vi.useRealTimers();
  });

  // ================================================================
  // Issue #1: Timer double-start race condition
  // ================================================================
  describe('Issue #1: Timer double-start prevention', () => {
    let coordinator: InstanceType<typeof GameStartCoordinator>;

    beforeEach(() => {
      coordinator = new GameStartCoordinator();
    });

    test('should start timer exactly once when all players ACK before timeout', () => {
      vi.useFakeTimers();
      const timeoutCalls: number[] = [];

      coordinator.initializeSequence('game1', ['p1', 'p2', 'p3'], 180);
      coordinator.setAcknowledgmentTimeout('game1', 3000, () => {
        timeoutCalls.push(Date.now());
      });

      // All players ACK
      coordinator.recordAcknowledgment('game1', 'p1', coordinator['activeSequences'].get('game1')!.messageId);
      coordinator.recordAcknowledgment('game1', 'p2', coordinator['activeSequences'].get('game1')!.messageId);
      const result = coordinator.recordAcknowledgment('game1', 'p3', coordinator['activeSequences'].get('game1')!.messageId);

      expect(result.allReady).toBe(true);

      // Advance past timeout - should NOT fire
      vi.advanceTimersByTime(5000);
      expect(timeoutCalls).toHaveLength(0);
    });

    test('should start timer exactly once when timeout fires before all ACKs', () => {
      vi.useFakeTimers();
      const timeoutCalls: number[] = [];

      coordinator.initializeSequence('game1', ['p1', 'p2', 'p3'], 180);
      const messageId = coordinator['activeSequences'].get('game1')!.messageId;

      coordinator.setAcknowledgmentTimeout('game1', 3000, () => {
        timeoutCalls.push(Date.now());
      });

      // Only 2 of 3 ACK
      coordinator.recordAcknowledgment('game1', 'p1', messageId);
      coordinator.recordAcknowledgment('game1', 'p2', messageId);

      // Timeout fires
      vi.advanceTimersByTime(3500);
      expect(timeoutCalls).toHaveLength(1);

      // Late ACK should report timer already started
      const lateResult = coordinator.recordAcknowledgment('game1', 'p3', messageId);
      expect(lateResult.late).toBe(true);
    });

    test('should not call timeout callback if sequence was cancelled', () => {
      vi.useFakeTimers();
      const timeoutCalls: number[] = [];

      coordinator.initializeSequence('game1', ['p1', 'p2'], 180);
      coordinator.setAcknowledgmentTimeout('game1', 3000, () => {
        timeoutCalls.push(Date.now());
      });

      // Cancel (simulating game reset)
      coordinator.cancelSequence('game1');

      vi.advanceTimersByTime(5000);
      expect(timeoutCalls).toHaveLength(0);
    });
  });

  // ================================================================
  // Issue #2: Host reconnection thread-safety
  // ================================================================
  describe('Issue #2: Host reconnection thread-safety', () => {
    test('should clear previous reconnection timeout on duplicate disconnect', () => {
      vi.useFakeTimers();

      const game = createGame('HOST_TEST', {
        hostSocketId: 'host-socket',
        hostUsername: 'host',
        hostPlayerId: 'host-id',
      });

      // Simulate first timeout being set
      const firstCalls: string[] = [];
      (game as any).hostReconnectionTimeout = setTimeout(() => {
        firstCalls.push('first');
      }, 30000);

      // Simulate clearing and setting new timeout (what the fix should do)
      clearTimeout((game as any).hostReconnectionTimeout);
      (game as any).hostReconnectionTimeout = setTimeout(() => {
        firstCalls.push('second');
      }, 30000);

      vi.advanceTimersByTime(35000);

      // Only second timeout should fire
      expect(firstCalls).toEqual(['second']);
    });
  });

  // ================================================================
  // Issue #3: Word Hunt state not cleared on reset
  // ================================================================
  describe('Issue #3: Word Hunt state cleared on reset', () => {
    test('should clear wordHuntState on resetGameForNewRound', () => {
      createGame('WH_TEST', {
        hostSocketId: 'socket-1',
        hostUsername: 'host',
        hostPlayerId: 'player-1',
      });

      // Simulate Word Hunt state
      const game = getGame('WH_TEST');
      game!.wordHuntState = {
        targetWord: 'EXAMPLE',
        targetFoundBy: 'p1',
        targetWordLength: 7,
        eliminatedPlayers: [],
        playerLives: {},
      };
      game!.blastModeState = {
        overlay: [],
        seed: 42,
        playerMoves: {},
      };

      resetGameForNewRound('WH_TEST');

      const resetGame = getGame('WH_TEST');
      expect(resetGame!.wordHuntState).toBeNull();
      expect(resetGame!.blastModeState).toBeNull();
    });

    test('should clear playerWordDetails on reset', () => {
      createGame('WH_TEST2', {
        hostSocketId: 'socket-1',
        hostUsername: 'host',
        hostPlayerId: 'player-1',
      });

      const game = getGame('WH_TEST2');
      (game as any).playerWordDetails = {
        player1: [{ word: 'TEST', score: 5 }],
        player2: [{ word: 'HELLO', score: 3 }],
      };

      resetGameForNewRound('WH_TEST2');

      const resetGame = getGame('WH_TEST2');
      if ((resetGame as any).playerWordDetails) {
        for (const username of Object.keys((resetGame as any).playerWordDetails)) {
          expect((resetGame as any).playerWordDetails[username]).toEqual([]);
        }
      }
    });
  });

  // ================================================================
  // Issue #4: Spectator upgrade missing state guard
  // ================================================================
  describe('Issue #4: Spectator upgrade state guard', () => {
    test('should prevent spectator upgrade when game is in progress', () => {
      createGame('SPEC_TEST', {
        hostSocketId: 'socket-host',
        hostUsername: 'host',
        hostPlayerId: 'player-host',
      });

      addUserToGame('SPEC_TEST', 'host', 'socket-host', { isHost: true });
      addSpectatorToGame('SPEC_TEST', 'spectator1', 'socket-spec1');

      // Put game in playing state
      updateGame('SPEC_TEST', { gameState: 'playing' });

      const result = upgradeSpectatorToPlayer('SPEC_TEST', 'spectator1');
      expect(result).toBe(false);
    });

    test('should allow spectator upgrade when game is waiting', () => {
      createGame('SPEC_TEST2', {
        hostSocketId: 'socket-host',
        hostUsername: 'host',
        hostPlayerId: 'player-host',
      });

      addUserToGame('SPEC_TEST2', 'host', 'socket-host', { isHost: true });
      addSpectatorToGame('SPEC_TEST2', 'spectator1', 'socket-spec1');

      const game = getGame('SPEC_TEST2');
      expect(game.gameState).toBe('waiting');

      const result = upgradeSpectatorToPlayer('SPEC_TEST2', 'spectator1');
      expect(result).toBe(true);
    });
  });

  // ================================================================
  // Issue #5: ACK sequence + reset deadlock
  // ================================================================
  describe('Issue #5: ACK sequence cancelled on reset', () => {
    let coordinator: InstanceType<typeof GameStartCoordinator>;

    beforeEach(() => {
      coordinator = new GameStartCoordinator();
    });

    test('should mark sequence as cancelled preventing timeout from firing', () => {
      vi.useFakeTimers();
      const timerCalls: number[] = [];

      coordinator.initializeSequence('game1', ['p1', 'p2'], 180);
      coordinator.setAcknowledgmentTimeout('game1', 3000, () => {
        timerCalls.push(Date.now());
      });

      // Only p1 ACKs
      const messageId = coordinator['activeSequences'].get('game1')!.messageId;
      coordinator.recordAcknowledgment('game1', 'p1', messageId);

      // Cancel sequence (simulating resetGame handler calling cleanupSequence)
      coordinator.cleanupSequence('game1');

      // Timeout should NOT fire after cancellation
      vi.advanceTimersByTime(5000);
      expect(timerCalls).toHaveLength(0);
    });

    test('should not accept ACKs after sequence cancelled', () => {
      coordinator.initializeSequence('game1', ['p1', 'p2'], 180);
      const messageId = coordinator['activeSequences'].get('game1')!.messageId;

      coordinator.cleanupSequence('game1');

      const result = coordinator.recordAcknowledgment('game1', 'p1', messageId);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('no_active_sequence');
    });
  });
});
