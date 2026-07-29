/**
 * useHostGameEvents — wheel-rush hostPlaying gate bypass (source-level contract)
 *
 * Bug: A desktop host who previously toggled TV broadcast mode persisted
 * `hostPlayingEnabled=false` to localStorage. On the next wheel-rush MP round,
 * the `if (hostPlayingRef.current && currentOnShowResults)` gate at the
 * validatedScores handler skipped the results transition. Because wheel-rush
 * has no dedicated TV broadcast results view, the host sat on the game screen
 * forever after the round ended ("stuck on game / blank" symptom).
 *
 * Fix: when gameMode === 'wheel-rush', bypass the hostPlayingRef gate and
 * always invoke onShowResults so the host always lands on the standard
 * results page. Other modes keep the original gate (TV broadcast UX intact).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('useHostGameEvents — wheel-rush hostPlaying gate bypass', () => {
  const source = readFileSync(
    resolve(__dirname, '../socket/useHostGameEvents.ts'),
    'utf8',
  );

  it('validatedScores handler reads gameMode for wheel-rush bypass', () => {
    expect(source).toMatch(/data\.gameMode\s*===\s*['"]wheel-rush['"]/);
  });

  it('shouldShowResults OR-combines hostPlayingRef with isWheelRush', () => {
    expect(source).toMatch(/hostPlayingRef\.current\s*\|\|\s*isWheelRush/);
  });

  it('validatedScores invocation uses shouldShowResults compound gate', () => {
    // The original tight gate `hostPlayingRef.current && currentOnShowResults`
    // is replaced by `shouldShowResults && currentOnShowResults` where
    // shouldShowResults = hostPlayingRef.current || isWheelRush.
    expect(source).toMatch(/shouldShowResults\s*&&\s*currentOnShowResults/);
    // wheelRushSummary still passed through to onShowResults — confirms we're
    // looking at the right call site.
    expect(source).toMatch(/wheelRushSummary:\s*data\.wheelRushSummary/);
  });
});
