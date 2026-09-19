/**
 * Per-run reward state for Word Tower v2. Pure — no React, no physics.
 *
 * Height stays whatever physics measures (see scoring.ts). This layer adds the
 * variable reward on top: perfect-drop streaks and v1's seeded surprise table,
 * re-paid in v2 currencies:
 *   bonusMeters     -> bonus points
 *   bonusScrambles  -> letter-wheel reshuffles
 *   nextWordHeightMult -> the NEXT block spawns wider (a better platform)
 */
import {
  type TowerSurpriseEvent,
  advanceTowerSeed,
  rollTowerSurprise,
  towerSeedUnit,
  towerSurpriseReward,
} from '@/lib/wordTower/towerSurprise';
import { WORD_TOWER_SCRAMBLES_START } from '@/shared/constants/wordTowerConstants';
import type { LandingQuality } from './landing';
import { scoreFromHeightM } from './scoring';

export const PERFECT_BONUS = 50;
const GOOD_BONUS = 10;
/** Combo multiplier stops growing here so a long streak stays sane. */
const COMBO_CAP = 8;
const POINTS_PER_BONUS_M = 100;
const MAX_WIDTH_MULT = 1.5;
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
}

export interface SurprisePayout {
  event: TowerSurpriseEvent;
  points: number;
  scrambles: number;
  widthMult: number;
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
  };
}

/** Width multiplier for the block about to spawn; the caller then clears it. */
export function consumeWidthMult(run: RunState): { run: RunState; mult: number } {
  return { run: { ...run, nextWidthMult: 1 }, mult: run.nextWidthMult };
}

export function applyLanding(
  prev: RunState,
  landing: { quality: LandingQuality; wordLen: number },
): { run: RunState; points: number; surprise: SurprisePayout | null } {
  const perfect = landing.quality === 'perfect';
  const combo = perfect ? prev.combo + 1 : 0;
  const points = perfect
    ? PERFECT_BONUS * Math.min(combo, COMBO_CAP)
    : landing.quality === 'good'
      ? GOOD_BONUS
      : 0;

  let seed = prev.seed;
  const rng = () => {
    seed = advanceTowerSeed(seed);
    return towerSeedUnit(seed);
  };
  const ctx = {
    floorCount: prev.floors + 1,
    wordsSinceLast: prev.wordsSinceSurprise + 1,
    wordLen: landing.wordLen,
    combo,
    baseMeters: 1 + landing.wordLen * 0.5,
  };
  // A miss (block slid off) never rolls — rewards follow good play.
  const event = landing.quality === 'miss' ? null : rollTowerSurprise(rng, ctx);

  let surprise: SurprisePayout | null = null;
  if (event) {
    const r = towerSurpriseReward(event, ctx);
    surprise = {
      event,
      points: r.bonusMeters * POINTS_PER_BONUS_M,
      scrambles: r.bonusScrambles,
      widthMult: Math.min(MAX_WIDTH_MULT, r.nextWordHeightMult),
    };
  }

  const run: RunState = {
    seed,
    floors: prev.floors + 1,
    combo,
    bestCombo: Math.max(prev.bestCombo, combo),
    bonus: prev.bonus + points + (surprise?.points ?? 0),
    scrambles: prev.scrambles + (surprise?.scrambles ?? 0),
    wordsSinceSurprise: surprise ? 0 : prev.wordsSinceSurprise + 1,
    nextWidthMult: Math.min(MAX_WIDTH_MULT, surprise && surprise.widthMult > 1 ? surprise.widthMult : prev.nextWidthMult),
    balls: Math.min(MAX_BALLS, prev.balls + (perfect && combo % BALL_EVERY_COMBO === 0 ? 1 : 0)),
  };

  return { run, points, surprise };
}

export function spendScramble(run: RunState): RunState | null {
  return run.scrambles > 0 ? { ...run, scrambles: run.scrambles - 1 } : null;
}

export function totalScore(heightM: number, bonus: number): number {
  return scoreFromHeightM(heightM) + bonus;
}
