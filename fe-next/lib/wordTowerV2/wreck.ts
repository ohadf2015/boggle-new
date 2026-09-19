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
import { BLOCK_HEIGHT_PX, blockWidthForWord } from './scoring';

export { MAX_BALLS } from './run';

export const BALL_RADIUS_PX = 34;
export const CHAIN_PX = 180;
/** Starting angle from vertical, radians — the ball is pulled back to the left. */
export const START_ANGLE = 0.9;
/** One full there-and-back swing. */
const SWING_PERIOD_MS = 1500;
const OMEGA = (Math.PI * 2) / SWING_PERIOD_MS;
const MATTER_BASE_DELTA_MS = 1000 / 60;
/** Horizontal gap between the ball's closest swing point and the tower edge. */
const CLEAR_GAP_PX = 16;
/** Time a cut ball flies from the bottom of the swing to the tower, roughly. */
const HIT_AT_TOWER_FRACTION = 0.6;

export interface WreckWorld {
  tower: TowerWorld;
  ids: string[];
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

export function buildWreckWorld(words: string[]): WreckWorld {
  const tower = createTowerWorld({ seed: 7 });
  const ids: string[] = [];
  let maxHalfW = 0;
  words.forEach((word, i) => {
    const id = `rival-${i}`;
    const w = blockWidthForWord(word);
    maxHalfW = Math.max(maxHalfW, w / 2);
    // A hand-stacked look: small alternating offsets, well inside the base.
    spawnBlock(tower, {
      id,
      x: (i % 2 === 0 ? 1 : -1) * Math.min(6, i),
      y: -(i * BLOCK_HEIGHT_PX + BLOCK_HEIGHT_PX / 2 + 2),
      widthPx: w,
      heightPx: BLOCK_HEIGHT_PX,
      vx: 0,
    });
    ids.push(id);
    for (let t = 0; t < SETTLE_MS_PER_BLOCK / 4; t += 1000 / 120) stepWorld(tower, 1000 / 120);
  });
  for (let t = 0; t < SETTLE_MS_PER_BLOCK; t += 1000 / 120) stepWorld(tower, 1000 / 120);

  const towerHeightPx = words.length * BLOCK_HEIGHT_PX;
  const reach = CHAIN_PX * Math.sin(START_ANGLE);
  // Cut at the lowest point, the ball crosses (reach + gap) sideways at the
  // swing's peak speed while gravity pulls it down; aim that at ~60% height.
  const vBottom = CHAIN_PX * START_ANGLE * OMEGA;
  const pivotX = -(maxHalfW + CLEAR_GAP_PX + BALL_RADIUS_PX + reach);
  const flightMs = (-pivotX - maxHalfW) / vBottom;
  const dropPx = 0.5 * GRAVITY_PX_PER_MS2 * flightMs ** 2;
  const bottomY = -(towerHeightPx * HIT_AT_TOWER_FRACTION) - dropPx;

  const world: WreckWorld = {
    tower,
    ids,
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
  let n = 0;
  for (const [id, base] of w.baseline) {
    const b = w.tower.blocks.get(id);
    if (!b) continue;
    const dropped = b.bounds.min.y - base.top > BLOCK_HEIGHT_PX * 0.8;
    const shoved = Math.abs(b.position.x - base.x) > base.w * 0.5;
    if (dropped || shoved) n += 1;
  }
  return n;
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
// Controls, zero-width and bidi overrides: a shared link is untrusted input,
// and a U+202E in a name would visually reverse the rest of the HUD line.
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

const clean = (s: string, max: number) => s.replace(UNSAFE, '').trim().slice(0, max);

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
