/**
 * Smash round: a friend's tower, a wrecking ball on a real chain.
 *
 * Its own physics world, on purpose. engine.ts measures ONE tower (height, peak,
 * collapse are all max-over-every-block), so a rival tower in the main run
 * would inflate your height and fake your collapse. Here the rival is the only
 * tower and the ball is a plain Matter body the engine's block maps never see.
 *
 * While on the chain the ball follows a closed-form swing (like the crane in
 * crane.ts): a Matter constraint pendulum bled energy until, seconds in, the
 * ball barely moved. Cutting the chain hands the body its exact swing velocity
 * and physics owns everything after — the player times the cut.
 */
import { Bodies, Body, Composite } from 'matter-js';
import { GRAVITY_PX_PER_MS2, type TowerWorld, createTowerWorld, spawnBlock, stepWorld } from './engine';
import type { TowerBlock } from './estateTower';
import { cleanUntrustedText } from './sanitizeText';
import { BLOCK_HEIGHT_PX, blockWidthForWord } from './scoring';

export { MAX_BALLS } from './run';

/** Grows with the slabs (56->76->120px): a smaller ball bounced off the heavier tower. */
export const BALL_RADIUS_PX = 70;
export const CHAIN_PX = 230;
/** Starting angle from vertical, radians — the ball is pulled back to the left. */
export const START_ANGLE = 0.9;
/** One full there-and-back swing. */
const SWING_PERIOD_MS = 1500;
const OMEGA = (Math.PI * 2) / SWING_PERIOD_MS;
const MATTER_BASE_DELTA_MS = 1000 / 60;
/**
 * Horizontal gap between the ball's closest swing point and the tower edge.
 *
 * The pivot has to clear the swing's full REACH, not just the bottom: the
 * pendulum overswings to the right by `CHAIN_PX * sin(START_ANGLE)`, and a
 * closer pivot means the hanging ball demolishes the building on its own,
 * before the player ever cuts. What that costs is a long flight, which is why
 * `pathHitsTower` exists — round 1 flew the ball across a quarter-screen of
 * open air with no aim, so most swings landed on the street and the raid had
 * no witnessed impact at all.
 */
const CLEAR_GAP_PX = 26;
/** Time a cut ball flies from the bottom of the swing to the tower, roughly. */
const HIT_AT_TOWER_FRACTION = 0.5;
/** Floors a round renders and smashes — the mini render shows the same slice. */
export const MAX_WRECK_BLOCKS = 24;
const MIN_FLOOR_W = 160;
const MAX_FLOOR_W = 320;
/** How far a floor may sit off the one below and still be carried by it. */
const MAX_LEAN_RATIO = 0.12;
/** …and how far the stack may wander off the base floor's axis in total. */
const MAX_DRIFT_RATIO = 0.25;

export interface WreckWorld {
  tower: TowerWorld;
  ids: string[];
  /** The floors as built, lowest first — labels and colours for the view. */
  floors: TowerBlock[];
  pivot: { x: number; y: number };
  ball: Body | null;
  /** Ball still on the chain (following the swing). */
  chain: boolean;
  /** ms since the current ball was hung. */
  swingMs: number;
  /** Rest pose per block, recorded once the tower has settled. */
  baseline: Map<string, { x: number; top: number; w: number }>;
  quarterPeriodMs: number;
  towerHeightPx: number;
}

const SETTLE_MS_PER_BLOCK = 700;

/** Swing state at `t` ms after hanging: starts pulled back left, at rest. */
function swingAt(w: WreckWorld, t: number) {
  const angle = -START_ANGLE * Math.cos(OMEGA * t);
  const angVel = START_ANGLE * OMEGA * Math.sin(OMEGA * t);
  return {
    x: w.pivot.x + CHAIN_PX * Math.sin(angle),
    y: w.pivot.y + CHAIN_PX * Math.cos(angle),
    vx: CHAIN_PX * Math.cos(angle) * angVel,
    vy: -CHAIN_PX * Math.sin(angle) * angVel,
  };
}

/** A word list (share link) as floors: the hand-stacked look the round always had. */
export function towerFromWords(words: string[]): TowerBlock[] {
  return words.slice(0, MAX_WRECK_BLOCKS).map((word, i) => ({
    word,
    w: blockWidthForWord(word),
    // Small alternating offsets, well inside the base.
    x: (i % 2 === 0 ? 1 : -1) * Math.min(6, i),
    y: -(i * BLOCK_HEIGHT_PX + BLOCK_HEIGHT_PX / 2 + 2),
    angle: 0,
    color: 0,
  }));
}

/**
 * A rival's stored `last_tower` as floors this round can actually build:
 * lowest first, upright, restacked on an even pitch and each floor pulled back
 * onto the one below. A stored tower is untrusted jsonb — a leaning or wildly
 * offset copy would collapse on its own, and a self-collapsing tower hands the
 * attacker a free 100% raid.
 */
export function wreckableTower(blocks: TowerBlock[]): TowerBlock[] {
  const usable = blocks.filter((b) => b && typeof b.word === 'string' && b.word.length > 0);
  // Ground is y=0 and up is negative: the lowest floor has the greatest y.
  const sorted = [...usable].sort((a, b) => (b.y ?? 0) - (a.y ?? 0)).slice(0, MAX_WRECK_BLOCKS);
  const out: TowerBlock[] = [];
  let prevX = 0;
  let prevW = 0;
  sorted.forEach((b, i) => {
    const w = Math.min(MAX_FLOOR_W, Math.max(MIN_FLOOR_W, Math.round(Number(b.w) || MIN_FLOOR_W)));
    const wanted = Number.isFinite(b.x) ? Number(b.x) : 0;
    const lean = MAX_LEAN_RATIO * Math.min(w, prevW || w);
    const drift = MAX_DRIFT_RATIO * (out[0]?.w ?? w);
    const onPrev = Math.max(prevX - lean, Math.min(prevX + lean, wanted));
    const x = i === 0 ? 0 : Math.max(-drift, Math.min(drift, onPrev));
    out.push({
      word: cleanUntrustedText(b.word, MAX_WORD),
      w,
      x: Math.round(x),
      y: -(i * BLOCK_HEIGHT_PX + BLOCK_HEIGHT_PX / 2 + 2),
      angle: 0,
      color: typeof b.color === 'number' ? b.color : 0,
    });
    prevX = x;
    prevW = w;
  });
  return out.filter((b) => b.word.length > 0);
}

/** Share-link round: a friend's words. */
export function buildWreckWorld(words: string[]): WreckWorld {
  return buildWreckWorldFromTower(towerFromWords(words));
}

/** Raid round: the rival's ACTUAL building, floor for floor. */
export function buildWreckWorldFromTower(blocks: TowerBlock[]): WreckWorld {
  const floors = wreckableTower(blocks);
  const tower = createTowerWorld({ seed: 7 });
  const ids: string[] = [];
  let maxHalfW = 0;
  floors.forEach((floor, i) => {
    const id = `rival-${i}`;
    maxHalfW = Math.max(maxHalfW, floor.w / 2);
    spawnBlock(tower, {
      id,
      x: floor.x,
      y: floor.y,
      widthPx: floor.w,
      heightPx: BLOCK_HEIGHT_PX,
      vx: 0,
    });
    ids.push(id);
    for (let t = 0; t < SETTLE_MS_PER_BLOCK / 4; t += 1000 / 120) stepWorld(tower, 1000 / 120);
  });
  for (let t = 0; t < SETTLE_MS_PER_BLOCK; t += 1000 / 120) stepWorld(tower, 1000 / 120);

  const towerHeightPx = floors.length * BLOCK_HEIGHT_PX;
  const reach = CHAIN_PX * Math.sin(START_ANGLE);
  // Cut at the lowest point, the ball crosses (reach + gap) sideways at the
  // swing's peak speed while gravity pulls it down; aim that at mid-height, so
  // the usable band of cut times spreads over the whole face of the building.
  const vBottom = CHAIN_PX * START_ANGLE * OMEGA;
  const pivotX = -(maxHalfW + CLEAR_GAP_PX + BALL_RADIUS_PX + reach);
  const flightMs = (-pivotX - maxHalfW) / vBottom;
  const dropPx = 0.5 * GRAVITY_PX_PER_MS2 * flightMs ** 2;
  const bottomY = -(towerHeightPx * HIT_AT_TOWER_FRACTION) - dropPx;

  const world: WreckWorld = {
    tower,
    ids,
    floors,
    pivot: { x: pivotX, y: bottomY - CHAIN_PX },
    ball: null,
    chain: false,
    swingMs: 0,
    baseline: new Map(),
    quarterPeriodMs: SWING_PERIOD_MS / 4,
    towerHeightPx,
  };
  recordBaseline(world);
  return world;
}

function recordBaseline(w: WreckWorld): void {
  for (const id of w.ids) {
    const b = w.tower.blocks.get(id);
    if (!b) continue;
    w.baseline.set(id, { x: b.position.x, top: b.bounds.min.y, w: b.bounds.max.x - b.bounds.min.x });
  }
}

/** Hang a fresh ball on the chain, pulled back to the start angle, at rest. */
export function hangBall(w: WreckWorld): Body {
  if (w.ball) Composite.remove(w.tower.engine.world, w.ball);
  w.swingMs = 0;
  const p = swingAt(w, 0);
  const ball = Bodies.circle(p.x, p.y, BALL_RADIUS_PX, {
    // Heavy (a block is ~11 mass units, this is ~145) and no air drag, so the
    // hit lands like iron, not foam.
    density: 0.04,
    frictionAir: 0,
    restitution: 0.1,
    friction: 0.4,
    label: 'wrecking-ball',
  });
  // Created dynamic THEN made static, so releasing restores its mass (see
  // engine.ts spawnBlock for the NaN this avoids).
  Body.setStatic(ball, true);
  Composite.add(w.tower.engine.world, ball);
  w.ball = ball;
  w.chain = true;
  return ball;
}

/** Cut the chain: the ball leaves with exactly the swing's velocity. */
export function cutBall(w: WreckWorld): void {
  if (!w.chain || !w.ball) return;
  const v = swingAt(w, w.swingMs);
  Body.setStatic(w.ball, false);
  Body.setVelocity(w.ball, { x: v.vx * MATTER_BASE_DELTA_MS, y: v.vy * MATTER_BASE_DELTA_MS });
  w.chain = false;
}

export function stepWreck(w: WreckWorld, elapsedMs: number): void {
  if (w.chain && w.ball) {
    w.swingMs += elapsedMs;
    const p = swingAt(w, w.swingMs);
    Body.setPosition(w.ball, { x: p.x, y: p.y });
  }
  stepWorld(w.tower, elapsedMs);
}

/** Blocks knocked out of place: dropped a block-height, or shoved off their spot. */
export function wreckedCount(w: WreckWorld): number {
  return wreckedIds(w).size;
}

/** Ids of the floors knocked out of place — the aftermath paints these as damaged. */
export function wreckedIds(w: WreckWorld): Set<string> {
  const out = new Set<string>();
  for (const [id, base] of w.baseline) {
    const b = w.tower.blocks.get(id);
    if (!b) continue;
    const dropped = b.bounds.min.y - base.top > BLOCK_HEIGHT_PX * 0.8;
    const shoved = Math.abs(b.position.x - base.x) > base.w * 0.5;
    if (dropped || shoved) out.add(id);
  }
  return out;
}

/**
 * Everything the building still is, standing floors and rubble alike.
 *
 * The aftermath frames THIS, not the swing rig: once the ball is spent the
 * pivot is a quarter-screen of empty sky to the left, and framing it shrinks
 * the one thing the player wants to look at — the tower they just hit.
 */
export function wreckBounds(w: WreckWorld): { left: number; right: number; top: number; bottom: number; cx: number } {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let sum = 0;
  let n = 0;
  for (const id of w.ids) {
    const b = w.tower.blocks.get(id);
    if (!b) continue;
    left = Math.min(left, b.bounds.min.x);
    right = Math.max(right, b.bounds.max.x);
    top = Math.min(top, b.bounds.min.y);
    sum += b.position.x;
    n += 1;
  }
  if (!Number.isFinite(left)) return { left: -160, right: 160, top: -BLOCK_HEIGHT_PX, bottom: 0, cx: 0 };
  // `cx` is where the floors ARE, not the middle of how far they scattered: one
  // slab that slid across the street would otherwise aim the payoff shot at
  // empty asphalt.
  return { left, right, top, bottom: 0, cx: sum / n };
}

/** Where a ball cut right now would first touch the building, if it would at all. */
export interface WreckHit {
  x: number;
  y: number;
  id: string;
  /** Floor index, 0 = ground floor. */
  floor: number;
  /** ms of flight before contact — the aim dots stop here. */
  tMs: number;
}

/**
 * Trace the cut ball's ballistics against the floors as they stand right now.
 *
 * This is what makes the swing readable: the arc goes lime and a target bracket
 * lands on the floor about to be hit, so the player is timing a visible thing
 * instead of guessing at a pendulum. Blocks are AABBs (they are upright until
 * something hits them) and the ball is a circle.
 */
export function pathHitsTower(w: WreckWorld, spanMs = 1100, steps = 110): WreckHit | null {
  if (!w.ball || !w.chain) return null;
  const v = swingAt(w, w.swingMs);
  for (let i = 1; i <= steps; i += 1) {
    const t = (spanMs * i) / steps;
    const x = v.x + v.vx * t;
    const y = v.y + v.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t;
    // Past the street, or thrown clean over the far side: nothing left to hit.
    if (y > BALL_RADIUS_PX) return null;
    for (let f = 0; f < w.ids.length; f += 1) {
      const b = w.tower.blocks.get(w.ids[f]);
      if (!b) continue;
      const cx = Math.max(b.bounds.min.x, Math.min(b.bounds.max.x, x));
      const cy = Math.max(b.bounds.min.y, Math.min(b.bounds.max.y, y));
      if ((x - cx) ** 2 + (y - cy) ** 2 <= BALL_RADIUS_PX ** 2) {
        return { x: cx, y: cy, id: w.ids[f], floor: f, tMs: t };
      }
    }
  }
  return null;
}

/** Raid accuracy from the damage done: a safe 0..1, never NaN on an empty tower. */
export function wreckAccuracy(wrecked: number, total: number): number {
  if (!Number.isFinite(wrecked) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(1, Math.max(0, wrecked / total));
}

/** Left-most x the swinging ball reaches (for framing). */
export function swingLeftPx(w: WreckWorld): number {
  return w.pivot.x - CHAIN_PX * Math.sin(START_ANGLE) - BALL_RADIUS_PX;
}

/** Where a ball cut right now would fly: plain ballistics (no air drag). */
export function ballPath(w: WreckWorld, points: number, spanMs: number): Array<{ x: number; y: number }> {
  if (!w.ball || !w.chain) return [];
  const v = swingAt(w, w.swingMs);
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= points; i += 1) {
    const t = (spanMs * i) / points;
    out.push({ x: v.x + v.vx * t, y: v.y + v.vy * t + 0.5 * GRAVITY_PX_PER_MS2 * t * t });
  }
  return out;
}

/** Ball out of play: stopped, or far off the side / below the ground. */
export function ballSpent(w: WreckWorld): boolean {
  const b = w.ball;
  if (!b || w.chain) return false;
  return b.speed < 0.05 || b.position.y > 400 || Math.abs(b.position.x) > 1400;
}

// ── Share link ───────────────────────────────────────────────────────────────

export interface RivalTower {
  name: string;
  words: string[];
}

const MAX_NAME = 20;
const MAX_WORDS = 30;
const MAX_WORD = 15;
// Controls, zero-width and bidi overrides are stripped (see sanitizeText.ts).
const clean = cleanUntrustedText;

/** Untrusted word list (share link, review URL) -> safe, clamped labels. */
export function sanitizeWords(raw: unknown[]): string[] {
  return raw
    .filter((x): x is string => typeof x === 'string')
    .slice(0, MAX_WORDS)
    .map((x) => clean(x, MAX_WORD))
    .filter(Boolean);
}

export function encodeRival(r: RivalTower): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ n: r.name, w: r.words }));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRival(param: string): RivalTower | null {
  if (!param) return null;
  try {
    const bin = atob(param.replace(/-/g, '+').replace(/_/g, '/'));
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as unknown;
    if (!json || typeof json !== 'object') return null;
    const { n, w, name, words } = json as Record<string, unknown>;
    const rawName = typeof n === 'string' ? n : typeof name === 'string' ? name : null;
    const rawWords = Array.isArray(w) ? w : Array.isArray(words) ? words : null;
    if (rawName === null || !rawWords) return null;
    const cleanWords = sanitizeWords(rawWords);
    return cleanWords.length > 0 ? { name: clean(rawName, MAX_NAME), words: cleanWords } : null;
  } catch {
    return null;
  }
}

// ── Raid verdict ─────────────────────────────────────────────────────────────

/**
 * What the result screen is allowed to SAY, derived from what the server
 * actually paid out.
 *
 * Round 2 shipped "GLANCING BLOW! / Not a scratch — they sleep well tonight"
 * stamped over "Stole 162" and "+196 coins": the headline was read off the
 * CLIENT's floor count while the money came from the SERVER's payout, and the
 * two disagreed. A player could not tell whether the attack had worked.
 *
 * So the tier is a pure function of the server outcome. `floorsKnocked` (the
 * Pixi count) only chooses between two tiers that both mean "it landed" — it
 * can never turn a payout into "nothing happened".
 */
export type RaidTier = 'blocked' | 'demolished' | 'rattled' | 'nothing';

export interface RaidVerdict {
  tier: RaidTier;
  /** The copy for this tier claims the swing did nothing. */
  saysNothingHappened: boolean;
  /** There is money to show. False ⇒ render no coin number at all. */
  showLoot: boolean;
  /** The headline is coins taken OFF them (vs. scrap banked for the swing). */
  stealHeadline: boolean;
  /** The ONE number the screen leads with. */
  headlineCoins: number;
}

export function raidVerdict(input: {
  kind: 'blocked' | 'damaged';
  coinsStolen: number;
  attackerCoins: number;
  floorsKnocked: number;
}): RaidVerdict {
  const stolen = Math.max(0, Math.floor(input.coinsStolen) || 0);
  const banked = Math.max(0, Math.floor(input.attackerCoins) || 0);
  const floors = Math.max(0, Math.floor(input.floorsKnocked) || 0);
  const stealHeadline = stolen > 0;
  const headlineCoins = stealHeadline ? stolen : banked;
  const showLoot = stolen + banked > 0;

  if (input.kind === 'blocked') {
    return { tier: 'blocked', saysNothingHappened: false, showLoot, stealHeadline, headlineCoins };
  }
  // Anything the server paid out is a HIT, whatever the client counted.
  if (stolen > 0 || banked > 0 || floors > 0) {
    return { tier: floors > 0 ? 'demolished' : 'rattled', saysNothingHappened: false, showLoot, stealHeadline, headlineCoins };
  }
  return { tier: 'nothing', saysNothingHappened: true, showLoot: false, stealHeadline: false, headlineCoins: 0 };
}

/** Where a payback swing left the books between you and the player who hit you. */
export type RevengeTier = 'blocked' | 'ahead' | 'square' | 'short';

export interface RevengeLedger {
  tier: RevengeTier;
  /** Coins they took off you in the raid you are answering. */
  theyTook: number;
  /** Coins you took back on this swing. */
  youTook: number;
  /** youTook - theyTook. Negative = they are still up on you. */
  net: number;
}

/**
 * The line that makes a revenge screenshot self-verifying: "THEY TOOK 120 →
 * YOU TOOK 200 BACK". Round 3's payback could not be proved from the evidence
 * because nothing on the result screen referred back to the raid that caused
 * it; a two-sided ledger cannot be read as a hit on somebody else.
 *
 * A held shield is a tier of its own whatever the coins say — their wall stood,
 * and copy that reads "you're ahead" over a blocked swing is the same class of
 * self-contradiction `raidVerdict` exists to prevent.
 */
export function revengeLedger(input: { theyTook: number; youTook: number; blocked: boolean }): RevengeLedger {
  const theyTook = Math.max(0, Math.floor(input.theyTook) || 0);
  const youTook = Math.max(0, Math.floor(input.youTook) || 0);
  const net = youTook - theyTook;
  const tier: RevengeTier = input.blocked ? 'blocked' : net > 0 ? 'ahead' : net < 0 ? 'short' : 'square';
  return { tier, theyTook, youTook, net };
}
