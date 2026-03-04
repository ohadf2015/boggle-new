/**
 * TDD RED: usePlayerGameEvents Word Hunt state sync
 *
 * Tests for three client-side bugs:
 * 1. handleResetGame should clear wordHuntEliminatedPlayers
 * 2. handleWordHuntTargetFound should set wordHuntTargetFound = true for non-finders
 * 3. handleWordHuntLifeUpdate should reconcile eliminatedPlayers from payload
 *
 * Uses source code analysis to verify the handler implementations
 * since full hook rendering requires extensive Socket.IO mocking.
 */

import fs from 'fs';
import path from 'path';

const sourceCode = fs.readFileSync(
  path.resolve(__dirname, '../usePlayerGameEvents.ts'),
  'utf-8'
);

describe('usePlayerGameEvents word hunt state sync', () => {
  describe('Bug 2: handleResetGame clears wordHuntEliminatedPlayers', () => {
    it('should call setWordHuntEliminatedPlayers in handleResetGame', () => {
      // The resetGame handler should clear eliminated players
      // Look for setWordHuntEliminatedPlayers call within the resetGame handler area
      const resetHandlerMatch = sourceCode.match(
        /handleResetGame[\s\S]*?(?=const\s+handle[A-Z])/
      );
      expect(resetHandlerMatch).not.toBeNull();
      expect(resetHandlerMatch![0]).toContain('setWordHuntEliminatedPlayers');
    });
  });

  describe('Bug 3: handleWordHuntTargetFound sets targetFound for non-finders', () => {
    it('should call setWordHuntTargetFound(true) in handleWordHuntTargetFound', () => {
      // The broadcast handler for target found should also set local targetFound state
      const targetFoundMatch = sourceCode.match(
        /handleWordHuntTargetFound[\s\S]*?(?=const\s+handle[A-Z])/
      );
      expect(targetFoundMatch).not.toBeNull();
      expect(targetFoundMatch![0]).toContain('setWordHuntTargetFound(true)');
    });
  });

  describe('Bug 4 client: handleWordHuntLifeUpdate reconciles eliminatedPlayers', () => {
    it('should update eliminatedPlayers from life update payload', () => {
      // The life update handler should reconcile eliminatedPlayers when present
      const lifeUpdateMatch = sourceCode.match(
        /handleWordHuntLifeUpdate[\s\S]*?(?=const\s+handle[A-Z])/
      );
      expect(lifeUpdateMatch).not.toBeNull();
      expect(lifeUpdateMatch![0]).toContain('eliminatedPlayers');
      expect(lifeUpdateMatch![0]).toContain('setWordHuntEliminatedPlayers');
    });
  });
});
