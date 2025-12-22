import type { LetterGrid, Language, DifficultyLevel } from '@/types';
import type { Socket } from 'socket.io-client';

/**
 * Earthquake state machine states
 */
export type EarthquakeState = 'idle' | 'warning' | 'shaking' | 'fire-round';

/**
 * Configuration for earthquake/fire round feature
 */
export interface EarthquakeConfig {
  enabled: boolean;
  triggerPercentageMin: number; // 0.8 = 80%
  triggerPercentageMax: number; // 1.0 = 100%
  warningDurationMs: number;    // 2000 = 2 seconds
  shakeDurationMs: number;      // 1000 = 1 second
  fireRoundDurationSeconds: number; // 15 seconds
  scoreMultiplier: number;      // 2.0 = 2x points
  minGameDurationSeconds: number; // 60 = don't trigger for games < 60s
}

/**
 * Default earthquake configuration
 */
export const DEFAULT_EARTHQUAKE_CONFIG: EarthquakeConfig = {
  enabled: true,
  triggerPercentageMin: 0.65, // Last 35% of game (adjusted to work with 1-minute games)
  triggerPercentageMax: 1.0,
  warningDurationMs: 2000,
  shakeDurationMs: 1000,
  fireRoundDurationSeconds: 15,
  scoreMultiplier: 2.0,
  minGameDurationSeconds: 45, // Support games as short as 45 seconds
};

/**
 * Fire round state
 */
export interface FireRoundState {
  active: boolean;
  remainingSeconds: number;
  startTime: number | null;
  endTime: number | null;
}

/**
 * Hook options for useEarthquakeFireRound
 */
export interface UseEarthquakeFireRoundOptions {
  // Common props
  enabled: boolean;
  gameDurationSeconds: number;
  currentTimeSeconds: number;
  language: Language;
  difficulty: DifficultyLevel;

  // Mode-specific
  mode: 'singleplayer' | 'multiplayer';
  onGridRegenerate?: (newGrid: LetterGrid, embeddedWords: string[]) => void;
  onEarthquakeStart?: () => void;
  onEarthquakeShake?: () => void;
  onFireRoundStart?: () => void;
  onFireRoundEnd?: () => void;

  // Multiplayer-specific
  socket?: Socket | null;
  isHost?: boolean;
  gameSessionId?: string;

  // Optional config override
  config?: Partial<EarthquakeConfig>;
}

/**
 * Hook return value for useEarthquakeFireRound
 */
export interface UseEarthquakeFireRoundReturn {
  earthquakeState: EarthquakeState;
  fireRoundActive: boolean;
  fireRoundRemaining: number;
  getScoreMultiplier: () => number;
  forceEarthquake: () => void; // For testing/debugging
}

/**
 * Socket event payloads
 */

export interface EarthquakeWarningPayload {
  gameSessionId: string;
  timestamp: number;
}

export interface EarthquakeShakePayload {
  gameSessionId: string;
  magnitude?: number; // Optional for future intensity levels
}

export interface FireRoundStartPayload {
  gameSessionId: string;
  grid: LetterGrid;
  embeddedWords?: string[];
  duration: number; // seconds
}

export interface FireRoundEndPayload {
  gameSessionId: string;
}

export interface TriggerEarthquakePayload {
  gameSessionId: string;
  triggerTime: number; // Calculated trigger time (seconds remaining)
}

/**
 * Backend game state extension
 */
export interface GameFireRoundState {
  active: boolean;
  startTime: number | null;
  endTime: number | null;
  triggeredBy: string | null; // Host socket ID
}
