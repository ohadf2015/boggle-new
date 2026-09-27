import type { Graphics } from 'pixi.js';

/**
 * Crane: a slim gantry rail along the TOP of the screen with a trolley running
 * on it, a cable, and the hook.
 *
 * Round 7 replaced a full tower crane — lattice mast standing on the street at
 * one edge, truss jib across the whole top, counterweight, cab. It was accurate
 * and it ate the screen: on a TV the mast ran the entire height of the play area
 * and the jib was a yellow bar over the whole width, leaving the tower a small
 * thing in the middle. The AIM contract is untouched (crane.ts owns the swing,
 * the arc and the landing prediction) — this is only what the player sees, and
 * what they should be looking at is their building.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const YELLOW = 0xffc629;
const SHADE = 0xc98a00;

/** Screen y of the rail's top edge. Sits above the HUD pills' baseline. */
export const JIB_SCREEN_Y = 6;
/** Rail depth in screen px — a beam, not a truss. */
const JIB_H = 10;

/** Where the pivot->hook cable crosses the horizontal line `y`. */
export function trolleyX(pivot: { x: number; y: number }, hook: { x: number; y: number }, y: number): number {
  const dy = hook.y - pivot.y;
  if (Math.abs(dy) < 1e-6) return hook.x;
  return pivot.x + ((y - pivot.y) / dy) * (hook.x - pivot.x);
}

export interface CraneFrame {
  scale: number;
  /** Half the screen width, world units. */
  halfW: number;
  /** World y of the screen's top and bottom edges. */
  topY: number;
  bottomY: number;
  /** Kept for the caller's contract; the rail spans the full width either way. */
  side: 'left' | 'right';
  /** Physics pivot (off-screen above) and the hook, world units. */
  pivot: { x: number; y: number };
  hook: { x: number; y: number } | null;
  /** Crane Yard upgrade: the rail's paint (main + stripe). Default site yellow. */
  paint?: { main: number; shade: number };
}

/**
 * The rail the trolley rides: one beam across the top edge with a hazard stripe.
 * Repainted only when the camera or viewport moved (the key), not every frame.
 */
export function paintCraneFrame(g: Graphics, f: CraneFrame, prevKey: string): string {
  const main = f.paint?.main ?? YELLOW;
  const shade = f.paint?.shade ?? SHADE;
  const key = `${f.scale.toFixed(3)}|${f.halfW.toFixed(1)}|${f.topY.toFixed(1)}|${main}`;
  if (key === prevKey) return key;
  const px = (n: number) => n / f.scale;
  g.clear();

  const top = f.topY + px(JIB_SCREEN_Y);
  const h = px(JIB_H);
  const from = -(f.halfW + px(20));
  const w = (f.halfW + px(20)) * 2;

  g.rect(from, top, w, h).fill(main);
  // Hazard chevrons: reads as site machinery at a glance, costs 1 stroke pass.
  for (let x = from; x < from + w; x += px(26)) {
    g.moveTo(x, top + h).lineTo(x + px(13), top);
  }
  g.stroke({ width: px(5), color: shade, alpha: 0.55 });
  g.rect(from, top, w, h).stroke({ width: px(3), color: INK, alignment: 1 });
  // A thin lip under the beam so the trolley has something to hang from.
  g.rect(from, top + h, w, px(3)).fill(INK);

  return key;
}

/** Trolley, cable and hook — the only crane parts that move every frame. */
export function paintCraneHook(g: Graphics, f: CraneFrame): void {
  g.clear();
  if (!f.hook) return;
  const px = (n: number) => n / f.scale;
  const railBottom = f.topY + px(JIB_SCREEN_Y) + px(JIB_H);
  const cableTopY = railBottom + px(6);
  const tx = trolleyX(f.pivot, f.hook, cableTopY);

  // Trolley: a compact carriage with two wheels on the rail.
  g.roundRect(tx - px(14), railBottom - px(3), px(28), px(11), px(3)).fill(INK);
  g.circle(tx - px(7), railBottom + px(6), px(3)).fill(CREAM);
  g.circle(tx + px(7), railBottom + px(6), px(3)).fill(CREAM);
  g.moveTo(tx, cableTopY).lineTo(f.hook.x, f.hook.y - px(10)).stroke({ width: px(3), color: INK });
  g.moveTo(tx, cableTopY).lineTo(f.hook.x, f.hook.y - px(10)).stroke({ width: px(1.2), color: 0xcfd6e6 });
  // Hook block: a small yellow pulley sitting on top of the slab.
  g.roundRect(f.hook.x - px(11), f.hook.y - px(12), px(22), px(9), px(2)).fill(f.paint?.main ?? YELLOW).stroke({ width: px(2), color: INK });
}
