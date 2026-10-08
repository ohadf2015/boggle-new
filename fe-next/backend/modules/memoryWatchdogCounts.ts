/**
 * Structure counts for MEMWATCH diag — so the next 24h watch can name which
 * Map is climbing instead of only seeing old_space MB.
 *
 * Kept in its own module so memoryWatchdog stays free of game-state imports
 * (tests, circular deps).
 */
import { getGameCount } from './gameStateManager';
import timerManager from '../utils/timerManager';
import gameStartCoordinator from '../utils/gameStartCoordinator';
import { activeQuizCodes } from './vocabQuizStore';
import { getTournamentCount } from './tournamentManager';

export function formatMemwatchCounts(): string {
  return (
    `counts[games=${getGameCount()} timers=${timerManager.getTimerCount()} ` +
    `seq=${gameStartCoordinator.getActiveSequenceCount()} ` +
    `quizzes=${activeQuizCodes().length} tournaments=${getTournamentCount()}]`
  );
}
