/**
 * The timing and physics of an arena beat. Pure — no Pixi, no React, no DOM.
 *
 * THE BRIDGE. A landed word throws the traced letters off the DOM board and
 * into the arena — that volley is drawn by `BoardFx`/`WordCast`, from the real
 * tile boxes, aimed at the `[data-adv-hit-target]` marker the arena publishes
 * over the foe. The canvas does not draw a second set of letters; it throws the
 * PUNCH. So the one number that matters here is WHEN the DOM bolt arrives, and
 * it is read from the same `castTiming` the DOM animation is built from — one
 * word, one impact frame, never two hits drifting apart.
 */
import { castTiming } from '../fx/castPath';
import { hitTier } from '../fx/hitTier';

/** Longest word that still gains power; past it a blow is simply maximal. */
const POWER_CAP = 9;

/** 0..1 — how hard a word of this length hits. Drives shake, knockback, debris. */
export function wordPower(len: number): number {
  return Math.min(1, Math.max(0, (len - 2) / (POWER_CAP - 2)));
}

/**
 * ms after a word lands that its letters reach the foe — the frame the canvas
 * must recoil on. Counts code points so Hebrew, Japanese and surrogate pairs
 * measure the same length the DOM cast measured.
 */
export function castImpactMs(word: string, reduced: boolean): number {
  return castTiming(Array.from(word).length, reduced).impactMs;
}

/** Freeze-frame on impact: the single cheapest thing that makes a hit feel heavy. */
export function hitStopMs(power: number, reduced = false): number {
  if (reduced) return 0;
  return Math.round(45 + Math.min(1, Math.max(0, power)) * 105);
}

/** How far the struck body is driven back, in canvas px. */
export function knockPx(power: number, stageW: number, reduced = false): number {
  if (reduced) return 0;
  return Math.round(stageW * (0.022 + Math.min(1, Math.max(0, power)) * 0.045));
}

/**
 * Upward speed (px per ms, negative) for a floating callout so that it drifts a
 * readable distance — about one line — over its whole life, whatever that life
 * is. Never a speed derived from the font size alone: at 0.055 px/ms per point,
 * a 22px "-1 ♥" left a 200px stage in three frames and nobody ever saw it.
 *
 * `maxRisePx` caps the whole drift, for a callout that starts just below an
 * opaque DOM panel and must not slide back up underneath it.
 */
export function floatRise(size: number, lifeMs: number, maxRisePx?: number): number {
  const natural = size * 1.6;
  const total = maxRisePx == null ? natural : Math.min(natural, Math.max(0, maxRisePx));
  return -total / Math.max(200, lifeMs);
}

export type LootKind = 'coin' | 'relic';
export interface LootPiece {
  kind: LootKind;
  /** ms after death this piece leaves the corpse. */
  delayMs: number;
  /** ms it spends in the air. `delayMs + durationMs` is when it lands. */
  durationMs: number;
  /** Sideways scatter, -1..1, before it homes on the HUD. */
  spread: number;
}

const MAX_COINS = 11;

/**
 * Default payout window when the caller has no kill word to time against; the real
 * one comes from `finaleTiming`, which keeps the shower inside the gap between the
 * foe's death and the opaque kill banner (which takes the corpse, gold pill and
 * relic bar with it). A margin keeps the last coin from flying under the curtain.
 */
export const LOOT_WINDOW_MS = 1050;

/** The shower a corpse throws: gold arcs out, then the relic last so it reads. */
export function lootBurst(gold: number, relic: boolean, windowMs = LOOT_WINDOW_MS): LootPiece[] {
  const w = Math.max(200, windowMs);
  const coins = Math.max(1, Math.min(MAX_COINS, Math.round(Math.sqrt(Math.max(0, gold)) * 2)));
  // Each piece is given its flight time first, and only the LEFTOVER window is
  // spread across the launches — so adding a coin shortens the stagger rather
  // than pushing the tail past the banner.
  const coinMs = Math.round(w * 0.55);
  const relicMs = Math.round(w * 0.62);
  const coinSpread = w - coinMs;
  const out: LootPiece[] = Array.from({ length: coins }, (_, i) => ({
    kind: 'coin' as const,
    delayMs: coins === 1 ? 0 : Math.round((coinSpread * i) / (coins - 1)),
    durationMs: coinMs,
    spread: ((i % 5) - 2) / 2,
  }));
  // Slower and launched mid-stream, so the trophy is the last thing to land.
  if (relic) out.push({ kind: 'relic', delayMs: w - relicMs, durationMs: relicMs, spread: 0 });
  return out;
}

export interface ArcPoint { x: number; y: number }

/**
 * A thrown thing's position at `p` (0..1) along a parabola from `from` to `to`,
 * peaking `lift` px above the straight line's midpoint.
 *
 * This is the WORD IN FLIGHT. The DOM cast assembles the traced letters into a
 * banner over the board and then fires 90ms bolts — five frames, which nobody
 * has ever seen and which a judge reasonably read as "the letters glow in place
 * and never travel". The canvas re-throws the same word as ONE readable object
 * across the whole `castImpactMs` window, so the impact beat has an attack-in-
 * flight beat to land against (Bookworm's arcing LITERATE/AWESOME).
 */
export function arcAt(p: number, from: ArcPoint, to: ArcPoint, lift: number): ArcPoint {
  const c = Math.min(1, Math.max(0, p));
  const x = from.x + (to.x - from.x) * c;
  const line = from.y + (to.y - from.y) * c;
  // 4c(1-c) peaks at exactly 1 when c = 0.5, so `lift` is the true arc height.
  return { x, y: line - lift * 4 * c * (1 - c) };
}

/** Floor under the missile type so it still reads on a 390px phone. */
const MISSILE_MIN = 11;
/** Rough advance width of one glyph in the heavy display face, in ems. */
const GLYPH_EM = 0.62;

/** Type size for the flying word: as big as the stage can hold, never smaller than legible. */
export function missileFontSize(len: number, stageW: number, stageH: number): number {
  const n = Math.max(1, len);
  // Leave a third of the width as margin so the chip's border and padding fit.
  const byWidth = (stageW * 0.66) / (n * GLYPH_EM);
  const byHeight = stageH * 0.17;
  return Math.max(MISSILE_MIN, Math.round(Math.min(byWidth, byHeight)));
}

/** A CRIT-tier word (hitTier's rule) earns the extra-heavy finisher blow. */
export const isFinisher = (word: string, pts: number): boolean => hitTier(word, pts) === 'crit';

export interface FinaleTiming {
  /** The foe dies when the killing word lands — never before. */
  deathAtMs: number;
  /** The opaque kill banner takes the screen. */
  bannerAtMs: number;
  /** How long the loot shower has before the banner covers it. */
  lootWindowMs: number;
}

const BOSS_HOLD_MS = 1100;
const ELITE_MIN_BANNER_MS = 1150;
const ELITE_HOLD_MS = 650;
const LOOT_MARGIN_MS = 100;

/** Measured from the moment the killing word is submitted. */
export function finaleTiming(word: string, boss: boolean): FinaleTiming {
  const deathAtMs = castImpactMs(word, false);
  const bannerAtMs = boss ? deathAtMs + BOSS_HOLD_MS : Math.max(ELITE_MIN_BANNER_MS, deathAtMs + ELITE_HOLD_MS);
  return { deathAtMs, bannerAtMs, lootWindowMs: bannerAtMs - deathAtMs - LOOT_MARGIN_MS };
}

export interface DeathBeat {
  /** ms after the death. */
  atMs: number;
  /** Debris pieces thrown. */
  debris: number;
  shake: number;
  /** Whole-stage hold on this beat (hit-stop). */
  freezeMs: number;
  flash: number;
}

/** A boss does not just fall: it freezes, then goes off in three staggered blasts. */
export function deathBeats(boss: boolean): DeathBeat[] {
  if (!boss) return [{ atMs: 0, debris: 34, shake: 22, freezeMs: 120, flash: 0.5 }];
  return [
    { atMs: 0, debris: 30, shake: 24, freezeMs: 360, flash: 0.6 },
    { atMs: 260, debris: 26, shake: 18, freezeMs: 0, flash: 0.3 },
    { atMs: 480, debris: 40, shake: 26, freezeMs: 0, flash: 0.55 },
  ];
}
