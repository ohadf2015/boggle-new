/**
 * Random Wave Modifiers — SINGLE-PLAYER ONLY.
 *
 * A modifier is a tiny descriptor that (a) patches the wave's {@link WaveConfig}
 * and/or (b) multiplies the player's word score, plus display metadata. Modifiers
 * spice up the SP wave loop ("Gold Rush!", "Chain Frenzy!") without adding new
 * tile types.
 *
 * WHY SP-ONLY: MP Blast is server-authoritative — a single fixed-wave board scored
 * server-side. It has no wave progression, and a client-applied scoring modifier
 * would be silently dropped by the server (re-arming the known MP grid-desync bug).
 * Selection is therefore a PURE function of (seed, wave): deterministic, replayable,
 * and trivially unit-testable. The caller gates application behind the existing
 * `isMultiplayer` boundary.
 */
import type { WaveConfig } from './blastWaveConfig';

export type BlastModifierId =
  | 'goldRush'
  | 'chainFrenzy'
  | 'doubleDown'
  | 'featherfall'
  | 'bombParty'
  | 'luckyVowels'
  | 'megaCombo';

export type BlastModifierColor =
  | 'lime'
  | 'pink'
  | 'cyan'
  | 'purple'
  | 'yellow'
  | 'orange';

/**
 * Typed, relative operations over WaveConfig numeric fields.
 *
 * IMPORTANT: only fields the SP engine actually READS belong here. Verified live:
 * `specialTileChance` + `goldDistribution` + `iceDistribution` (→ getWaveDistribution
 * → tile generation), `cascadeChainBonus` (→ useBlastCascade), `movesAllowed`
 * (→ BlastGame engine options). Deliberately ABSENT: `vowelModifier` (never threaded
 * into useGridInit) and `maxCascadeChain` (useBlastCascade uses momentum tiers, not
 * the config field) — patching those would be a silent no-op that lies to the player.
 */
export interface ModifierPatch {
  specialTileChanceAdd?: number;
  goldDistributionMul?: number;
  iceDistributionMul?: number;
  cascadeChainBonusMul?: number;
  cascadeChainBonusAdd?: number;
  movesAllowedAdd?: number;
}

export interface BlastWaveModifier {
  id: BlastModifierId;
  /** Brand color family for the reveal banner + HUD chip. */
  color: BlastModifierColor;
  /** lucide-react icon name. */
  icon: string;
  /** Client-side score multiplier (SP only). Omit / 1 = no change. */
  scoreMultiplier?: number;
  /** Relative WaveConfig patch. */
  patch?: ModifierPatch;
}

/**
 * Catalog. Each entry must DO something (patch and/or score multiplier). Colors
 * follow the design system's reserved semantics (yellow = celebration/gold,
 * orange = warmth/heat).
 */
export const BLAST_MODIFIERS: Record<BlastModifierId, BlastWaveModifier> = {
  goldRush: {
    id: 'goldRush',
    color: 'yellow',
    icon: 'Coins',
    scoreMultiplier: 1.15,
    patch: { goldDistributionMul: 1.6 },
  },
  chainFrenzy: {
    id: 'chainFrenzy',
    color: 'lime',
    icon: 'Link',
    patch: { cascadeChainBonusMul: 2 },
  },
  doubleDown: {
    id: 'doubleDown',
    color: 'pink',
    icon: 'Dices',
    scoreMultiplier: 2,
    patch: { movesAllowedAdd: -1 },
  },
  featherfall: {
    id: 'featherfall',
    color: 'cyan',
    icon: 'Feather',
    // Relaxed, generous pace — two extra moves to breathe.
    patch: { movesAllowedAdd: 2 },
  },
  bombParty: {
    id: 'bombParty',
    color: 'orange',
    icon: 'Bomb',
    patch: { specialTileChanceAdd: 0.1 },
  },
  luckyVowels: {
    id: 'luckyVowels',
    color: 'purple',
    icon: 'Sparkles',
    // Fewer ice obstacles + a little extra gold — words come easy, luck is on your side.
    patch: { iceDistributionMul: 0.35, goldDistributionMul: 1.25 },
  },
  megaCombo: {
    id: 'megaCombo',
    color: 'cyan',
    icon: 'Zap',
    scoreMultiplier: 1.1,
    patch: { cascadeChainBonusAdd: 0.5 },
  },
};

const MODIFIER_IDS = Object.keys(BLAST_MODIFIERS) as BlastModifierId[];

/** Chance (0-1) that a wave >= 2 rolls a modifier at all. */
const MODIFIER_GATE = 0.55;

/** Deterministic 32-bit hash of (seed, wave, salt). Well-mixed mulberry-style. */
function hash(seed: number, wave: number, salt: number): number {
  let h = (seed | 0) ^ Math.imul(wave + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return h >>> 0;
}

function hash01(seed: number, wave: number, salt: number): number {
  return hash(seed, wave, salt) / 4294967296;
}

/**
 * Pick a modifier for a wave — pure function of (seed, wave).
 * - Wave 1 always returns null (teach the basics first).
 * - Wave >= 2 rolls a {@link MODIFIER_GATE} chance.
 * - Never repeats the immediately-previous wave's modifier (recursion bottoms
 *   out at wave 1 → null, so the chain is bounded at ~12 deep).
 */
export function selectWaveModifier(seed: number, wave: number): BlastWaveModifier | null {
  if (wave <= 1) return null;
  if (hash01(seed, wave, 1) >= MODIFIER_GATE) return null;

  let index = hash(seed, wave, 2) % MODIFIER_IDS.length;
  const prev = selectWaveModifier(seed, wave - 1);
  if (prev && MODIFIER_IDS[index] === prev.id) {
    index = (index + 1) % MODIFIER_IDS.length;
  }
  return BLAST_MODIFIERS[MODIFIER_IDS[index]];
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/**
 * Apply a modifier's patch to a wave config. Pure — returns a fresh object,
 * never mutates the input. All numeric fields are clamped to safe ranges.
 */
export function applyModifierToWaveConfig(
  config: WaveConfig,
  mod: BlastWaveModifier | null,
): WaveConfig {
  if (!mod || !mod.patch) return { ...config };
  const p = mod.patch;
  const next: WaveConfig = { ...config };

  if (p.specialTileChanceAdd !== undefined) {
    next.specialTileChance = clamp01(next.specialTileChance + p.specialTileChanceAdd);
  }
  if (p.goldDistributionMul !== undefined) {
    next.goldDistribution = clamp01(next.goldDistribution * p.goldDistributionMul);
  }
  if (p.iceDistributionMul !== undefined) {
    next.iceDistribution = clamp01(next.iceDistribution * p.iceDistributionMul);
  }
  if (p.cascadeChainBonusMul !== undefined) {
    next.cascadeChainBonus = next.cascadeChainBonus * p.cascadeChainBonusMul;
  }
  if (p.cascadeChainBonusAdd !== undefined) {
    next.cascadeChainBonus = next.cascadeChainBonus + p.cascadeChainBonusAdd;
  }
  if (p.movesAllowedAdd !== undefined) {
    next.movesAllowed = Math.max(1, next.movesAllowed + p.movesAllowedAdd);
  }
  return next;
}
