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
    triggerPercentageMin: number;
    triggerPercentageMax: number;
    warningDurationMs: number;
    shakeDurationMs: number;
    fireRoundDurationSeconds: number;
    scoreMultiplier: number;
    minGameDurationSeconds: number;
}
/**
 * Default earthquake configuration
 */
export declare const DEFAULT_EARTHQUAKE_CONFIG: EarthquakeConfig;
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
    enabled: boolean;
    gameDurationSeconds: number;
    currentTimeSeconds: number;
    language: Language;
    difficulty: DifficultyLevel;
    mode: 'singleplayer' | 'multiplayer';
    onGridRegenerate?: (newGrid: LetterGrid, embeddedWords: string[]) => void;
    onEarthquakeStart?: () => void;
    onEarthquakeShake?: () => void;
    onFireRoundStart?: () => void;
    onFireRoundEnd?: () => void;
    onTimerPause?: () => void;
    onTimerResume?: () => void;
    socket?: Socket | null;
    isHost?: boolean;
    gameSessionId?: string | number;
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
    forceEarthquake: () => void;
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
    magnitude?: number;
}
export interface FireRoundStartPayload {
    gameSessionId: string;
    grid: LetterGrid;
    embeddedWords?: string[];
    duration: number;
}
export interface FireRoundEndPayload {
    gameSessionId: string;
}
export interface TriggerEarthquakePayload {
    gameSessionId: string;
    triggerTime: number;
}
/**
 * Backend game state extension
 */
export interface GameFireRoundState {
    active: boolean;
    startTime: number | null;
    endTime: number | null;
    triggeredBy: string | null;
}
