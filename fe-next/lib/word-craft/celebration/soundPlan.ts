import type { SoundEffectKey } from '@/lib/audio/soundEffectsConfig';
import { clampTierForCosy, type CommitTier } from './commitTier';
import type { HeatBeat } from './heatTransition';

/**
 * Pure mapping from a committed word's shape to the SFX keys that should play.
 *
 * WordCraft historically fired only Pixi scenes on commit — the celebration was
 * silent. This module is the audio twin of `commitPlan.ts`: given the resolved
 * tier + flavour of a turn, it returns an ordered list of registry sound keys
 * (most important first) which the React layer plays through `useSoundEffects`.
 *
 * Kept pure (no React, no Howler) so the escalation ladder is unit-testable and
 * the cosy clamp stays in one place.
 */

/** The flourish layered on top of the base `wordAccepted` confirm, per tier. */
const TIER_FLOURISH: Record<CommitTier, SoundEffectKey | null> = {
  soft: null,
  nice: 'comboMilestone',
  great: 'streakFire',
  huge: 'streakMilestone',
  bingo: 'megaCascade',
};

export function commitSoundKeys(
  tier: CommitTier,
  hasRareTile: boolean,
  cosy: boolean,
): SoundEffectKey[] {
  const effective = cosy ? clampTierForCosy(tier) : tier;
  const keys: SoundEffectKey[] = ['wordAccepted'];

  const flourish = TIER_FLOURISH[effective];
  if (flourish) keys.push(flourish);

  // A rare/high-value tile earns its own sparkle on top of the tier sound,
  // but stay calm in cosy mode where the point is a quiet, unhurried play.
  if (hasRareTile && !cosy) keys.push('rareWord');

  // De-dupe while preserving order (clamping can collapse two tiers onto one key).
  return Array.from(new Set(keys));
}

/** Territory capture reward — scales with how much ground was taken. */
export function captureSound(capturedCount: number): SoundEffectKey | null {
  if (capturedCount <= 0) return null;
  if (capturedCount >= 3) return 'chestOpen';
  return 'coinCollect';
}

/** Heat state-machine beats (enter overdrive, burn out, recover). */
export function heatBeatSound(beat: HeatBeat): SoundEffectKey | null {
  switch (beat) {
    case 'enter-overdrive':
      return 'powerUp';
    case 'enter-burnout':
      return 'comboBreak';
    case 'recover':
      return 'levelUp';
    case 'exit-overdrive':
    default:
      return null;
  }
}

export type GameOverResult = 'win' | 'lose' | 'draw';

export function gameOverSound(result: GameOverResult): SoundEffectKey {
  if (result === 'win') return 'crownVictory';
  if (result === 'lose') return 'defeatSting';
  return 'victoryFanfare';
}
