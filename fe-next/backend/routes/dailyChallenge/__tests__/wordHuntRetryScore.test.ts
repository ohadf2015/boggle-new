/**
 * Word Hunt — retry-penalty gate
 *
 * Bug (2026-04-30): server treated *any* pre-existing row as "this submit is a
 * paid retry" and shaved 100 off `efficiency_score` before storing. That meant
 * an idempotent re-submit (network drop after server insert, page re-mount,
 * concurrent request) of a single play would be persisted at `real - 100` and
 * the daily-challenge leaderboard would silently show the wrong score.
 *
 * Fix: gate the penalty on `reportedExtraTries > existingExtraTries`. Only
 * a *real* paid retry advances the client counter; idempotent re-submits
 * carry the same counter value and must not be penalised.
 *
 * These tests pin that gate so the bug cannot regress.
 */

import { describe, it, expect } from 'vitest';
import { computeWordHuntRetryScore } from '../utils';
import { COIN_COSTS } from '../../../../utils/coinManager';

const PENALTY = COIN_COSTS.DAILY_RETRY_LEADERBOARD_PENALTY;

describe('computeWordHuntRetryScore', () => {
  it('first submission with no existing row → no penalty', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 500,
        existingExtraTries: 0,
        reportedExtraTries: 0,
        hasExistingRow: false,
      })
    ).toEqual({ finalScore: 500, penaltyApplied: 0, isPaidRetry: false });
  });

  it('idempotent re-submit (existing row, reported === existing) → no penalty', () => {
    // The bug: this case used to apply a 100-point penalty.
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 800,
        existingExtraTries: 0,
        reportedExtraTries: 0,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 800, penaltyApplied: 0, isPaidRetry: false });
  });

  it('idempotent re-submit during an active paid-retry play → no penalty', () => {
    // Player paid for retry once. Counter on both sides reads 1. Network
    // dropped before the 2nd attempt's submit landed; results page re-mounted
    // and re-POSTed. Same counter → no second penalty.
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 700,
        existingExtraTries: 1,
        reportedExtraTries: 1,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 700, penaltyApplied: 0, isPaidRetry: false });
  });

  it('paid retry (reported > existing) → penalty applied', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 800,
        existingExtraTries: 0,
        reportedExtraTries: 1,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 800 - PENALTY, penaltyApplied: PENALTY, isPaidRetry: true });
  });

  it('client counter went backwards (defensive) → no penalty', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 600,
        existingExtraTries: 2,
        reportedExtraTries: 1,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 600, penaltyApplied: 0, isPaidRetry: false });
  });

  it('penalty clamps the stored score to 0 when raw < penalty', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 50,
        existingExtraTries: 0,
        reportedExtraTries: 1,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 0, penaltyApplied: PENALTY, isPaidRetry: true });
  });

  it('paid retry that bumps counter from N → N+1 still penalises', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 950,
        existingExtraTries: 1,
        reportedExtraTries: 2,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 950 - PENALTY, penaltyApplied: PENALTY, isPaidRetry: true });
  });

  it('rounds raw efficiency before subtracting the penalty', () => {
    expect(
      computeWordHuntRetryScore({
        rawEfficiency: 800.6,
        existingExtraTries: 0,
        reportedExtraTries: 1,
        hasExistingRow: true,
      })
    ).toEqual({ finalScore: 801 - PENALTY, penaltyApplied: PENALTY, isPaidRetry: true });
  });
});
