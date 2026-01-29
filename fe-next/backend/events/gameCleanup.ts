/**
 * Game Cleanup Event System
 *
 * Event-based cleanup to break circular dependencies between handlers.
 * Instead of handlers requiring each other directly, they subscribe to cleanup events.
 *
 * This solves the circular dependency where:
 * - shared.ts requires earthquakeHandler (for clearGameEarthquakeState)
 * - shared.ts requires hintHandler (for clearGameHintState)
 * - Those handlers may require shared.ts
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger';

// Create typed event emitter for game cleanup
class GameCleanupEmitter extends EventEmitter {
  constructor() {
    super();
    // Increase max listeners since multiple handlers may subscribe
    this.setMaxListeners(20);
  }

  /**
   * Emit game end cleanup event
   * Called when a game ends to trigger cleanup in all subscribed handlers
   */
  emitGameEnd(gameCode: string): void {
    logger.debug('CLEANUP', `Emitting gameEnd cleanup for ${gameCode}`);
    this.emit('gameEnd', { gameCode });
  }

  /**
   * Emit game reset cleanup event
   * Called when a game is reset/restarted
   */
  emitGameReset(gameCode: string): void {
    logger.debug('CLEANUP', `Emitting gameReset cleanup for ${gameCode}`);
    this.emit('gameReset', { gameCode });
  }

  /**
   * Subscribe to game end cleanup
   * Handlers should call this to register their cleanup functions
   */
  onGameEnd(handler: (data: { gameCode: string }) => void): void {
    this.on('gameEnd', handler);
  }

  /**
   * Subscribe to game reset cleanup
   */
  onGameReset(handler: (data: { gameCode: string }) => void): void {
    this.on('gameReset', handler);
  }

  /**
   * Unsubscribe from game end cleanup
   */
  offGameEnd(handler: (data: { gameCode: string }) => void): void {
    this.off('gameEnd', handler);
  }

  /**
   * Unsubscribe from game reset cleanup
   */
  offGameReset(handler: (data: { gameCode: string }) => void): void {
    this.off('gameReset', handler);
  }
}

// Singleton instance
export const gameCleanupEmitter = new GameCleanupEmitter();

export default gameCleanupEmitter;
