/**
 * Per-run reward state for Word Tower v2. Pure — no React, no physics.
 *
 * Height stays whatever physics measures (see scoring.ts). This layer adds the
 * variable reward on top: perfect-drop streaks and v2's reward crates
 * (rewards.ts), whose effects are banked here and spent drop by drop.
 */
import { WORD_TOWER_SCRAMBLES_START } from '@/shared/constants/wordTowerConstants';
import type { LandingQuality } from './landing';
import { type RewardPayout, payoutFor, rollReward } from './rewards';
import { scoreFromHeightM } from './scoring';

export const PERFECT_BONUS = 50;
const GOOD_BONUS = 10;
/** Combo multiplier stops growing here so a long streak stays sane. */
const COMBO_CAP = 8;
const MAX_WIDTH_MULT = 1.5;
const MAX_BANKED_DROPS = 6;
/** Wrecking balls: two to start, one per 3-perfect streak step, capped. */
export const MAX_BALLS = 5;
const BALL_EVERY_COMBO = 3;

export interface RunState {
  seed: number;
  floors: number;
  combo: number;
  bestCombo: number;
  bonus: number;
  scrambles: number;
  wordsSinceSurprise: number;
  /** Width multiplier waiting for the next spawned block. 1 = none. */
  nextWidthMult: number;
  /** Wrecking balls banked for the smash round. */
  balls: number;
  /** Tenants moved in so far — a wider (longer) word houses more. */
  tenants: number;
  /** Drops left with the slow, narrow "steady" swing. */
  steadyDrops: number;
  /** Drops left that fall dead straight. */
  plumbDrops: number;
  /** Crates opened this run (achievements read it). */
  crates: number;
}

/** A crate's payout as the run reports it (points already folded into bonus). */
export type SurprisePayout = RewardPayout;

/** Mulberry-style LCG step for the run's reward rolls; pure and replayable. */
function nextSeed(seed: number): number {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0;
}

export function createRun(seed: number): RunState {
  return {
    seed: seed >>> 0 || 1,
    floors: 0,
    combo: 0,
    bestCombo: 0,
    bonus: 0,
    scrambles: WORD_TOWER_SCRAMBLES_START,
    wordsSinceSurprise: 0,
    nextWidthMult: 1,
    balls: 2,
    tenants: 0,
    steadyDrops: 0,
    plumbDrops: 0,
    crates: 0,
  };
}

/**
 * Who moves into a floor. Width is the word's reward, so a longer word houses
 * more people; a perfect drop adds one; a sloppy floor half-fills; a miss is
 * empty. ponytail: linear in letters, the ceiling is the arrival animation
 * (one figure per tenant) — batch figures if words ever exceed ~12 letters.
 */
export function tenantsFor(quality: LandingQuality, wordLen: number): number {
  if (quality === 'miss') return 0;
  const base = Math.max(1, wordLen - 2);
  if (quality === 'perfect') return base + 1;
  if (quality === 'sloppy') return Math.max(1, Math.ceil(base / 2));
  return base;
}

/** Effects for the floor about to be hoisted; each banked effect ticks down once. */
export function consumeDrop(run: RunState): { run: RunState; widthMult: number; steady: boolean; plumb: boolean } {
  return {
    run: {
      ...run,
      nextWidthMult: 1,
      steadyDrops: Math.max(0, run.steadyDrops - 1),
      plumbDrops: Math.max(0, run.plumbDrops - 1),
    },
    widthMult: run.nextWidthMult,
    steady: run.steadyDrops > 0,
    plumb: run.plumbDrops > 0,
  };
}

export function applyLanding(
  prev: RunState,
  landing: { quality: LandingQuality; wordLen: number },
): { run: RunState; points: number; reward: RewardPayout | null; tenants: number } {
  const perfect = landing.quality === 'perfect';
  const tenants = tenantsFor(landing.quality, landing.wordLen);
  const combo = perfect ? prev.combo + 1 : 0;
  const points = perfect
    ? PERFECT_BONUS * Math.min(combo, COMBO_CAP)
    : landing.quality === 'good'
      ? GOOD_BONUS
      : 0;

  let seed = prev.seed;
  const rng = () => {
    seed = nextSeed(seed);
    return seed / 4294967296;
  };
  const floors = prev.floors + 1;
  const id = rollReward(rng, { quality: landing.quality, combo, sinceLast: prev.wordsSinceSurprise, floors });
  const reward = id ? payoutFor(id, floors) : null;

  const run: RunState = {
    ...prev,
    seed,
    floors,
    combo,
    bestCombo: Math.max(prev.bestCombo, combo),
    bonus: prev.bonus + points + (reward?.points ?? 0),
    scrambles: prev.scrambles + (reward?.scrambles ?? 0),
    wordsSinceSurprise: reward ? 0 : prev.wordsSinceSurprise + 1,
    nextWidthMult: Math.min(MAX_WIDTH_MULT, Math.max(prev.nextWidthMult, reward?.widthMult ?? 1)),
    balls: Math.min(MAX_BALLS, prev.balls + (perfect && combo % BALL_EVERY_COMBO === 0 ? 1 : 0)),
    tenants: prev.tenants + tenants,
    steadyDrops: Math.min(MAX_BANKED_DROPS, prev.steadyDrops + (reward?.steadyDrops ?? 0)),
    plumbDrops: Math.min(MAX_BANKED_DROPS, prev.plumbDrops + (reward?.plumbDrops ?? 0)),
    crates: prev.crates + (reward ? 1 : 0),
  };

  return { run, points, reward, tenants };
}

export function spendScramble(run: RunState): RunState | null {
  return run.scrambles > 0 ? { ...run, scrambles: run.scrambles - 1 } : null;
}

export function totalScore(heightM: number, bonus: number): number {
  return scoreFromHeightM(heightM) + bonus;
}
