/**
 * blastTelemetry — thin PostHog wrapper for blast-mode growth events.
 *
 * Each emitter is fire-and-forget: errors from posthog.capture (e.g. when
 * PostHog isn't initialized in tests/SSR) are swallowed so gameplay is
 * never interrupted by analytics failures.
 */
import posthog from 'posthog-js';
import type { BlastBadgeId } from './blastBadges';

type Difficulty = 'easy' | 'medium' | 'hard' | string;

function safeCapture(event: string, payload: Record<string, unknown>): void {
  try {
    posthog.capture(event, payload);
  } catch {
    // swallow — analytics must not break the game loop
  }
}

export function trackBlastRunStarted(params: {
  difficulty: Difficulty;
  language: string;
}): void {
  safeCapture('blast_run_started', { ...params });
  // Canonical cross-mode funnel event so Blast runs appear in unified
  // `game_started` dashboards without a blast-specific union.
  safeCapture('game_started', { mode: 'blast', gameMode: 'blast', ...params });
}

export function trackBlastWaveCompleted(params: {
  waveNumber: number;
  score: number;
  wordCount: number;
  clearPct: number;
}): void {
  safeCapture('blast_wave_completed', { ...params });
}

export function trackBlastRunEnded(params: {
  finalScore: number;
  wavesCompleted: number;
  maxCombo: number;
  clearPct: number;
  wordCount: number;
  bestWordLength: number;
  difficulty: Difficulty;
}): void {
  safeCapture('blast_run_ended', { ...params });
  safeCapture('game_completed', {
    mode: 'blast',
    gameMode: 'blast',
    score: params.finalScore,
    wordCount: params.wordCount,
    difficulty: params.difficulty,
    wavesCompleted: params.wavesCompleted,
    maxCombo: params.maxCombo,
    clearPct: params.clearPct,
    bestWordLength: params.bestWordLength,
  });
}

export function trackBlastBadgeUnlocked(params: {
  badgeId: BlastBadgeId;
  runFinalScore: number;
}): void {
  safeCapture('blast_badge_unlocked', { ...params });
}

export function trackBlastResultsViewed(params: {
  finalScore: number;
  wavesCompleted: number;
  badgeCount: number;
}): void {
  safeCapture('blast_results_viewed', { ...params });
}

/**
 * Fired when player starts drawing a path then releases without submitting.
 * Critique signal: are word lengths too short / grid too small / vocab too thin?
 */
export function trackBlastPathAbandoned(params: {
  wordLength: number;
  timeSeconds: number;
  waveNumber: number;
}): void {
  safeCapture('blast_path_abandoned', { ...params });
}

/**
 * Fired when a cascade clears a tile that mattered for the active goal
 * (target_word letter, color_power tile). Validates whether cascade-credit
 * framing actually feels positive vs hidden-loss.
 */
export function trackBlastTileWastedInCascade(params: {
  tileType: string;
  goalRelevant: boolean;
  goalType: 'target_word' | 'color_power' | string;
  waveNumber: number;
}): void {
  safeCapture('blast_tile_wasted_in_cascade', { ...params });
}

export function trackBlastBrag(params: {
  finalScore: number;
  percentile: number | null;
  method: 'share' | 'clipboard';
}): void {
  safeCapture('blast_brag_shared', { ...params });
}
