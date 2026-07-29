/**
 * Game Lifecycle Services
 *
 * Modular services extracted from the shared.ts god module.
 * Each service has a single responsibility.
 */

// Core game flow
export { startGameTimer } from './gameTimer';
export { endGame } from './gameEnd';
export { calculateAndBroadcastFinalScores } from './gameScores';
export { recordGameResultsToSupabase } from './gameResults';

// Post-game workflows
export { handlePeerValidation } from './peerValidation';
export { handleTournamentCompletion } from './tournamentEnd';

// Bot management
export { startBotsForGame } from './botGame';
export { autoAddBotsForSoloPlayer } from './autoAddBots';
export { startBotsForWordHunt } from './botWordHunt';

// Types
export type {
  PlayerResult,
  BotSubmission,
  Bot,
  AIValidationResult,
  XpInfo,
  LifetimeAchievement,
  GameResults,
  UserData,
} from './types';
