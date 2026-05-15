/**
 * cascadeTelemetry — thin PostHog wrapper for WordCraft Cascade events.
 *
 * Mirror of `wordCraftTelemetry`: fire-and-forget; errors are swallowed.
 * Single emitter per event call site to avoid the double-fire issue
 * captured in memory `posthog-weakness-fixes-2026-05-15`.
 */
import posthog from 'posthog-js';

function safeCapture(event: string, payload: Record<string, unknown>): void {
  try {
    posthog.capture(event, payload);
  } catch {
    /* analytics must not break gameplay */
  }
}

export interface WordSubmittedParams {
  round: number;
  word: string;
  length: number;
  baseScore: number;
  chainCount: number;
  totalScore: number;
  comboCountThisRound: number;
}

export function trackCascadeWordSubmitted(params: WordSubmittedParams): void {
  safeCapture('wordcraft_cascade_word_submitted', { ...params });
}

export interface ComboParams {
  round: number;
  chainCount: number;
  totalScore: number;
  chainWords: string[];
}

export function trackCascadeCombo(params: ComboParams): void {
  safeCapture('wordcraft_cascade_combo', { ...params });
}

export interface FireWarningParams {
  round: number;
  fireRow: number;
  totalRows: number;
  secondsToTop: number;
}

export function trackCascadeFireWarning(params: FireWarningParams): void {
  safeCapture('wordcraft_cascade_fire_warning', { ...params });
}

export interface FireGameOverParams {
  round: number;
  finalScore: number;
  target: number;
  passed: boolean;
}

export function trackCascadeFireGameOver(params: FireGameOverParams): void {
  safeCapture('wordcraft_cascade_fire_gameover', { ...params });
}
