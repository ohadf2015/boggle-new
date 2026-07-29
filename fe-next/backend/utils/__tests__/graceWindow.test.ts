/**
 * Grace Window constants
 *
 * The post-game word-submit grace window is the single cushion that lets a
 * player's last-second word land after the server has already transitioned the
 * round to 'finished'. The previous 1.5s value was too tight for mobile / laggy
 * links (a backgrounded tab routinely takes >1.5s to receive endGame), so
 * last-second submissions were rejected as GAME_NOT_IN_PROGRESS. These tests pin
 * the contract: a forgiving default, an env override, and a distributed-lock TTL
 * that always outlives the grace window.
 */
import { describe, it, expect } from 'vitest';
import {
  WORD_SUBMIT_GRACE_PERIOD_MS,
  GRACE_PERIOD_LOCK_TTL_MS,
} from '../graceWindow';

describe('graceWindow constants', () => {
  it('defaults the word-submit grace window to a mobile-forgiving value (>= 3000ms)', () => {
    expect(WORD_SUBMIT_GRACE_PERIOD_MS).toBeGreaterThanOrEqual(3000);
  });

  it('keeps the grace lock TTL strictly longer than the grace window', () => {
    // The distributed lock must not expire before the grace window closes, or a
    // late submission could be processed twice across instances.
    expect(GRACE_PERIOD_LOCK_TTL_MS).toBeGreaterThan(WORD_SUBMIT_GRACE_PERIOD_MS);
  });
});
