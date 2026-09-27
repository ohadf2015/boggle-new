/**
 * computeDrillImprovement — turns a drill's prior progress snapshot + this run's
 * score into "you got better" signals the results UI can surface.
 *
 * Founder ask (2026-05-23): make the player feel they're improving over time —
 * find genuine metrics where they did better and show them. We compute three
 * truthful signals; the UI shows the single most flattering one.
 */

import { describe, it, expect } from 'vitest';
import { computeDrillImprovement } from '../drillImprovement';

describe('computeDrillImprovement', () => {
  it('first ever play is NOT a personal best (nothing to beat)', () => {
    const r = computeDrillImprovement(null, 300, null);
    expect(r.isPersonalBest).toBe(false);
    expect(r.totalPlays).toBe(0);
    expect(r.previousBest).toBe(0);
    expect(r.averageScore).toBe(0);
  });

  it('beating the prior high score is a personal best', () => {
    const prior = { highScore: 400, totalPlays: 3, totalScore: 900 };
    const r = computeDrillImprovement(prior, 500, 200);
    expect(r.isPersonalBest).toBe(true);
    expect(r.previousBest).toBe(400);
  });

  it('equalling or falling short of the high score is not a personal best', () => {
    const prior = { highScore: 400, totalPlays: 3, totalScore: 900 };
    expect(computeDrillImprovement(prior, 400, 0).isPersonalBest).toBe(false);
    expect(computeDrillImprovement(prior, 350, 0).isPersonalBest).toBe(false);
  });

  it('reports the prior running average (rounded)', () => {
    const prior = { highScore: 400, totalPlays: 4, totalScore: 1000 };
    // prior avg = 1000 / 4 = 250
    expect(computeDrillImprovement(prior, 260, null).averageScore).toBe(250);
  });

  it('flags improvement over the immediately previous session', () => {
    const prior = { highScore: 600, totalPlays: 5, totalScore: 2000 };
    expect(computeDrillImprovement(prior, 450, 400).improvedVsLast).toBe(true);
    expect(computeDrillImprovement(prior, 350, 400).improvedVsLast).toBe(false);
    // No prior session known → cannot claim improvement
    expect(computeDrillImprovement(prior, 999, null).improvedVsLast).toBe(false);
  });

  it('passes through the current score', () => {
    expect(computeDrillImprovement(null, 123, null).currentScore).toBe(123);
  });
});
