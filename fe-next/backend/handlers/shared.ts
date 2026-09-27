/**
 * Shared Handler Utilities
 *
 * Compatibility layer for the decomposed game lifecycle services.
 * Re-exports functions from focused service modules.
 *
 * NOTE: This file is kept for backward compatibility.
 * New code should import directly from:
 * - backend/services/gameLifecycle
 * - backend/utils/socketHelpers
 */

// Re-export game lifecycle services
import {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  recordGameResultsToSupabase,
  startBotsForGame,
  handlePeerValidation,
  handleTournamentCompletion,
} from '../services/gameLifecycle';

// Re-export isSocketMigrating from its new home
import { isSocketMigrating } from '../utils/socketHelpers';

export {
  startGameTimer,
  endGame,
  calculateAndBroadcastFinalScores,
  recordGameResultsToSupabase,
  startBotsForGame,
  isSocketMigrating,
  handlePeerValidation,
  handleTournamentCompletion,
};
