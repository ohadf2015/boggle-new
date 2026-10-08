/**
 * deleteGame emits gameDeleted but never called cleanupSequence — so every
 * finished/abandoned room left its GameStartSequence (ack sets + timeout
 * handles) in the singleton map. Host-reconnect timeout is the overnight
 * path that hits this without going through resetGame / startGame.
 */
import { afterEach, describe, expect, it } from 'vitest';
import gameStartCoordinator from '../gameStartCoordinator';
import { gameCleanupEmitter } from '../../events/gameCleanup';

afterEach(() => {
  gameStartCoordinator.clearAll();
});

describe('gameStartCoordinator ↔ gameDeleted', () => {
  it('drops a leftover start sequence when the room is deleted', () => {
    gameStartCoordinator.initializeSequence('HOSTTO', ['alice'], 60);
    expect(gameStartCoordinator.hasActiveSequence('HOSTTO')).toBe(true);

    gameCleanupEmitter.emitGameDeleted('HOSTTO');

    expect(gameStartCoordinator.hasActiveSequence('HOSTTO')).toBe(false);
    expect(gameStartCoordinator.getActiveSequenceCount()).toBe(0);
  });
});
