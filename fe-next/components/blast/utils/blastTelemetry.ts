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
