import { Graphics } from 'pixi.js';

/**
 * The three beats the raid was missing: the aim, the hit, and the wreck.
 *
 * Round 1's swing drew a dotted arc into empty sky, the ball never visibly
 * touched the building, and the payout was a card over a blank background. So:
 * the arc now ends ON the floor it will hit, contact leaves a burst you can
 * read in a single frame, and the floors that came down stay marked afterwards.
 *
 * Same rules as towerArt.ts — every width divided by the scene scale so strokes
 * are a constant number of SCREEN pixels, hard edges, no soft gradients.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const LIME = 0xbfff00;
const GOLD = 0xffe135;
const PINK = 0xff2e88;

export interface AimPoint {
  x: number;
  y: number;
}

/**
 * Flight path while the ball is on the chain. Lime and solid when this cut
 * would connect, faint cream when it would sail past — the player is timing a
 * visible thing rather than guessing at a pendulum.
 */
export function paintAimArc(g: Graphics, scale: number, pts: AimPoint[], hits: boolean): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (pts.length === 0) return;
  const colour = hits ? LIME : CREAM;
  pts.forEach((p, i) => {
    const k = i / Math.max(1, pts.length - 1);
    const r = hits ? px(3 + 5 * k) : px(2 + 2.5 * (1 - k));
    g.circle(p.x, p.y, r).fill({ color: colour, alpha: hits ? 0.45 + 0.55 * k : 0.16 + 0.24 * (1 - k) });
  });
}

/**
 * Target bracket on the floor about to be hit, pulsing. Coin Master shows you
 * the thing you are about to break BEFORE you break it; this is that promise,
 * drawn on the actual slab the ball will meet.
 */
export function paintAimTarget(g: Graphics, scale: number, hit: AimPoint | null, pulse: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (!hit) return;
  const r = px(34 + 5 * pulse);
  const t = px(6);
  const arm = px(20);
  // Four corner brackets around the contact point, plus crosshair ticks.
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = hit.x + sx * r;
      const y = hit.y + sy * r;
      g.rect(sx < 0 ? x : x - arm, sy < 0 ? y : y - t, arm, t);
      g.rect(sx < 0 ? x : x - t, sy < 0 ? y : y - arm, t, arm);
    }
  }
  g.fill({ color: LIME, alpha: 0.9 });
  g.circle(hit.x, hit.y, px(5)).fill({ color: CREAM, alpha: 0.9 });
}

/**
 * The hit itself: a white core, a hard ring punching outwards, spikes, and
 * speed lines trailing back along the ball's heading. Lives ~0.6s so a still
 * frame of the moment reads as force, not as a ball parked next to a wall.
 */
export function paintImpact(
  g: Graphics,
  scale: number,
  burst: { x: number; y: number; dirX: number; dirY: number; age: number; life: number } | null,
): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (!burst) return;
  const k = Math.min(1, burst.age / burst.life);
  const fade = 1 - k;
  if (fade <= 0) return;
  const { x, y } = burst;
  const grow = px(26 + 88 * k);

  // Shockwave ring.
  g.circle(x, y, grow).stroke({ width: px(11 * fade + 3), color: GOLD, alpha: 0.8 * fade });
  g.circle(x, y, grow * 0.62).stroke({ width: px(7 * fade + 2), color: CREAM, alpha: 0.55 * fade });

  // Spikes — a hard starburst, uneven so it reads hand-drawn, not procedural.
  const spikes = 9;
  for (let i = 0; i < spikes; i += 1) {
    const a = (Math.PI * 2 * i) / spikes + 0.3;
    const len = grow * (i % 2 ? 1.3 : 0.95);
    const wob = px(11 * fade + 3);
    g.moveTo(x + Math.cos(a) * grow * 0.3, y + Math.sin(a) * grow * 0.3)
      .lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      .stroke({ width: wob, color: i % 2 ? GOLD : CREAM, alpha: 0.6 * fade });
  }

  // Speed lines behind the ball, so the direction of the blow is legible.
  const len = Math.hypot(burst.dirX, burst.dirY) || 1;
  const ux = -burst.dirX / len;
  const uy = -burst.dirY / len;
  for (let i = -1; i <= 1; i += 1) {
    const ox = -uy * px(38) * i;
    const oy = ux * px(38) * i;
    g.moveTo(x + ux * px(60) + ox, y + uy * px(60) + oy)
      .lineTo(x + ux * px(220 + 90 * k) + ox, y + uy * px(220 + 90 * k) + oy)
      .stroke({ width: px(11 * fade + 2), color: CREAM, alpha: 0.5 * fade });
  }

  // A bright bite at the contact point — small on purpose: the ball has to stay
  // readable inside it, or the frame reads as a dust cloud instead of a blow.
  g.circle(x, y, px(20) * fade + px(5)).fill({ color: CREAM, alpha: 0.6 * fade });
}

/**
 * What is left of a floor that came down: a black scorch wash, jagged cracks
 * and a pink corner tag. The aftermath is read off the building, so the damage
 * has to survive on it after the dust settles.
 */
export function paintDamage(
  g: Graphics,
  scale: number,
  floors: Array<{ x: number; y: number; w: number; h: number; angle: number; seed: number }>,
): void {
  const px = (n: number) => n / scale;
  g.clear();
  for (const f of floors) {
    const cos = Math.cos(f.angle);
    const sin = Math.sin(f.angle);
    const at = (lx: number, ly: number) => ({ x: f.x + lx * cos - ly * sin, y: f.y + lx * sin + ly * cos });
    const hw = f.w / 2;
    const hh = f.h / 2;

    const c0 = at(-hw, -hh);
    const c1 = at(hw, -hh);
    const c2 = at(hw, hh);
    const c3 = at(-hw, hh);
    g.poly([c0.x, c0.y, c1.x, c1.y, c2.x, c2.y, c3.x, c3.y]).fill({ color: INK, alpha: 0.32 });

    // Two cracks across the slab, deterministic per floor so they never crawl.
    for (let c = 0; c < 2; c += 1) {
      const base = ((f.seed * 37 + c * 53) % 100) / 100;
      const steps = 5;
      const start = at(-hw + f.w * base * 0.5, -hh);
      g.moveTo(start.x, start.y);
      for (let s = 1; s <= steps; s += 1) {
        const jitter = (((f.seed * 17 + s * 29 + c * 11) % 21) - 10) / 10;
        const p = at(-hw + f.w * base * 0.5 + jitter * f.w * 0.12, -hh + (f.h * s) / steps);
        g.lineTo(p.x, p.y);
      }
      g.stroke({ width: px(5), color: INK, alpha: 0.95 });
    }

    // Corner tag: the floor is OUT, not merely dusty.
    const tag = at(-hw + px(16), -hh + px(16));
    g.circle(tag.x, tag.y, px(13)).fill(PINK).stroke({ width: px(3), color: INK, alignment: 1 });
    const a = at(-hw + px(16) - px(6), -hh + px(16) - px(6));
    const b = at(-hw + px(16) + px(6), -hh + px(16) + px(6));
    const c = at(-hw + px(16) + px(6), -hh + px(16) - px(6));
    const d = at(-hw + px(16) - px(6), -hh + px(16) + px(6));
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).moveTo(c.x, c.y).lineTo(d.x, d.y).stroke({ width: px(3.5), color: INK });
  }
}

/**
 * The floor the player CALLED before the swing, marked for the whole round.
 *
 * The bar drops a crosshair on every building in the target's village and lets
 * you pick what to smash; ours picks a floor. Drawn as a pink ring with ticks
 * so it never reads as the lime "this cut connects" bracket.
 */
export function paintCalledShot(
  g: Graphics,
  scale: number,
  at: { x: number; y: number; w: number; h: number } | null,
  pulse: number,
): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (!at) return;
  const rx = at.w / 2 + px(12 + 4 * pulse);
  const ry = at.h / 2 + px(12 + 4 * pulse);
  const t = px(7);
  const arm = px(26);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = at.x + sx * rx;
      const y = at.y + sy * ry;
      g.rect(sx < 0 ? x : x - arm, sy < 0 ? y : y - t, arm, t).fill({ color: PINK, alpha: 0.95 });
      g.rect(sx < 0 ? x : x - t, sy < 0 ? y : y - arm, t, arm).fill({ color: PINK, alpha: 0.95 });
    }
  }
  g.circle(at.x, at.y, px(15)).stroke({ width: px(6), color: PINK, alpha: 0.9 });
}

/**
 * The ball in flight, as a comet.
 *
 * A wrecking ball photographs as a dark circle sitting near a wall: the frame
 * before contact reads as "parked", not "incoming", which is exactly what the
 * round-3 evidence was marked down for. A hot trail behind the free ball puts
 * force and heading into EVERY airborne frame, so a still landing either side
 * of the burst still sells the blow.
 *
 * Positions are newest-first, in engine px. Only painted once the chain is cut.
 */
export function paintBallTrail(g: Graphics, scale: number, trail: Array<{ x: number; y: number }>, radius: number): void {
  const px = (n: number) => n / scale;
  g.clear();
  if (trail.length < 2) return;
  for (let i = trail.length - 1; i >= 1; i -= 1) {
    const k = 1 - i / trail.length;
    const r = radius * (0.35 + 0.6 * k);
    g.circle(trail[i].x, trail[i].y, r).fill({ color: i % 2 ? GOLD : PINK, alpha: 0.16 + 0.32 * k });
  }
  // A hard edge along the heading so the direction reads at a glance.
  g.moveTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
  for (let i = trail.length - 2; i >= 0; i -= 1) g.lineTo(trail[i].x, trail[i].y);
  g.stroke({ width: px(9), color: GOLD, alpha: 0.55 });
  g.circle(trail[0].x, trail[0].y, radius * 1.18).stroke({ width: px(7), color: CREAM, alpha: 0.5 });
}
