/**
 * blastTelemetry tests — verifies each emitter fires a correctly-named
 * PostHog event with the expected payload shape. PostHog itself is mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock posthog-js BEFORE importing the module under test so the capture
// spy is wired in before blastTelemetry grabs the reference.
const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

// Canonical start/completion are routed through growthTracking (separately
// tested in blastTelemetry.canonical.test.ts). Stub them here so these
// blast-specific PostHog assertions stay isolated from the persistence path.
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

import {
  trackBlastRunStarted,
  trackBlastWaveCompleted,
  trackBlastRunEnded,
  trackBlastBadgeUnlocked,
  trackBlastResultsViewed,
  trackBlastPathAbandoned,
  trackBlastTileWastedInCascade,
} from '../blastTelemetry';

describe('blastTelemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  it('fires blast_run_started with difficulty + language', () => {
    trackBlastRunStarted({ difficulty: 'hard', language: 'en' });
    expect(captureMock).toHaveBeenCalledWith('blast_run_started', {
      difficulty: 'hard',
      language: 'en',
    });
  });

  it('fires blast_wave_completed with wave stats', () => {
    trackBlastWaveCompleted({
      waveNumber: 2,
      score: 450,
      wordCount: 6,
      clearPct: 82,
    });
    expect(captureMock).toHaveBeenCalledWith('blast_wave_completed', {
      waveNumber: 2,
      score: 450,
      wordCount: 6,
      clearPct: 82,
    });
  });

  it('fires blast_run_ended with full run summary', () => {
    trackBlastRunEnded({
      finalScore: 12340,
      wavesCompleted: 4,
      maxCombo: 7,
      clearPct: 88,
      wordCount: 24,
      bestWordLength: 8,
      difficulty: 'medium',
    });
    expect(captureMock).toHaveBeenCalledWith(
      'blast_run_ended',
      expect.objectContaining({
        finalScore: 12340,
        wavesCompleted: 4,
        maxCombo: 7,
        bestWordLength: 8,
      }),
    );
  });

  it('fires blast_badge_unlocked per badge id', () => {
    trackBlastBadgeUnlocked({ badgeId: 'comboKing', runFinalScore: 8200 });
    expect(captureMock).toHaveBeenCalledWith('blast_badge_unlocked', {
      badgeId: 'comboKing',
      runFinalScore: 8200,
    });
  });

  it('fires blast_results_viewed with summary counts', () => {
    trackBlastResultsViewed({
      finalScore: 9000,
      wavesCompleted: 3,
      badgeCount: 5,
    });
    expect(captureMock).toHaveBeenCalledWith('blast_results_viewed', {
      finalScore: 9000,
      wavesCompleted: 3,
      badgeCount: 5,
    });
  });

  it('fires blast_path_abandoned with word_length + time_s', () => {
    trackBlastPathAbandoned({ wordLength: 5, timeSeconds: 3.4, waveNumber: 7 });
    expect(captureMock).toHaveBeenCalledWith('blast_path_abandoned', {
      wordLength: 5,
      timeSeconds: 3.4,
      waveNumber: 7,
    });
  });

  it('fires blast_tile_wasted_in_cascade with goal_relevant flag', () => {
    trackBlastTileWastedInCascade({
      tileType: 'pink',
      goalRelevant: true,
      goalType: 'color_power',
      waveNumber: 4,
    });
    expect(captureMock).toHaveBeenCalledWith('blast_tile_wasted_in_cascade', {
      tileType: 'pink',
      goalRelevant: true,
      goalType: 'color_power',
      waveNumber: 4,
    });
  });

  it('never throws when posthog.capture throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('posthog not initialized');
    });
    expect(() =>
      trackBlastRunStarted({ difficulty: 'easy', language: 'en' }),
    ).not.toThrow();
  });
});
