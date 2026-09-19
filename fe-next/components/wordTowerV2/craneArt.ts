import type { Graphics } from 'pixi.js';

/**
 * Tower crane: lattice mast standing on the street at one screen edge, cab on
 * top, a truss jib pinned to the top of the screen, counterweight past the
 * mast, and a trolley that rides the jib wherever the cable crosses it.
 *
 * The physics pivot sits a full arm (220px) above the hook — off-screen — so the
 * old crane drew its jib off-screen too and players saw a bare line. The jib
 * now lives in SCREEN space; the cable still points at the real pivot, so the
 * swing reads exactly as it moves.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const YELLOW = 0xffc629;
const SHADE = 0xc98a00;
const CONCRETE = 0x5b6078;

/** Screen y of the jib's top chord. Below the notch, behind the HUD pills. */
export const JIB_SCREEN_Y = 10;
const JIB_H = 18;
/** Mast centre, screen px in from the edge (the ruler owns the outer ~30px). */
const MAST_INSET = 46;
const MAST_W = 22;

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
  /** Mast side: the screen edge the HUD is NOT on. */
  side: 'left' | 'right';
  /** Physics pivot (off-screen above) and the hook, world units. */
  pivot: { x: number; y: number };
  hook: { x: number; y: number } | null;
}

export function paintCrane(g: Graphics, f: CraneFrame): void {
  const px = (n: number) => n / f.scale;
  const dir = f.side === 'left' ? -1 : 1;
  g.clear();

  const jibTop = f.topY + px(JIB_SCREEN_Y);
  const jibH = px(JIB_H);
  const jibBottom = jibTop + jibH;
  const mastX = dir * (f.halfW - px(MAST_INSET));
  const mastW = px(MAST_W);
  // The street is world y=0; below the screen there is nothing to draw.
  const mastBottom = Math.min(0, f.bottomY);

  // Mast: two legs + X bracing, only over the visible span.
  const l = mastX - mastW / 2;
  const r = mastX + mastW / 2;
  if (mastBottom > jibBottom) {
    g.rect(l, jibBottom, mastW, mastBottom - jibBottom).fill({ color: YELLOW, alpha: 0.9 });
    const step = mastW * 1.2;
    for (let y = mastBottom; y > jibBottom + step; y -= step) {
      g.moveTo(l, y).lineTo(r, y - step).moveTo(r, y).lineTo(l, y - step);
    }
    g.stroke({ width: px(2), color: SHADE });
    g.rect(l, jibBottom, mastW, mastBottom - jibBottom).stroke({ width: px(2.5), color: INK });
  }

  // Jib from beyond the far edge to past the mast; counter-jib + weight at the edge.
  const jibFrom = -dir * (f.halfW + px(20));
  const jibTo = dir * (f.halfW + px(20));
  const jl = Math.min(jibFrom, jibTo);
  g.rect(jl, jibTop, Math.abs(jibTo - jibFrom), jibH).fill(YELLOW);
  for (let x = jl; x < jl + Math.abs(jibTo - jibFrom); x += px(24)) {
    g.moveTo(x, jibBottom).lineTo(x + px(12), jibTop).lineTo(x + px(24), jibBottom);
  }
  g.stroke({ width: px(2.5), color: SHADE });
  g.rect(jl, jibTop, Math.abs(jibTo - jibFrom), jibH).stroke({ width: px(3), color: INK, alignment: 1 });

  const cw = px(30);
  const cwX = dir > 0 ? f.halfW - cw + px(6) : -f.halfW - px(6);
  g.rect(cwX, jibBottom, cw, px(26)).fill(CONCRETE).stroke({ width: px(2.5), color: INK });
  g.moveTo(cwX, jibBottom + px(13)).lineTo(cwX + cw, jibBottom + px(13)).stroke({ width: px(1.5), color: INK, alpha: 0.5 });

  // Operator cab hanging under the jib on the inner side of the mast.
  const cabW = px(26);
  const cabX = dir > 0 ? l - cabW : r;
  g.roundRect(cabX, jibBottom, cabW, px(24), px(3)).fill(YELLOW).stroke({ width: px(2.5), color: INK });
  g.rect(cabX + px(5), jibBottom + px(5), cabW - px(10), px(9)).fill({ color: 0x9fe7ff, alpha: 0.9 });

  if (!f.hook) return;
  const cableTopY = jibBottom + px(8);
  const tx = trolleyX(f.pivot, f.hook, cableTopY);
  g.roundRect(tx - px(15), jibBottom - px(2), px(30), px(10), px(2)).fill(INK);
  g.circle(tx - px(8), jibBottom + px(8), px(3)).fill(CREAM);
  g.circle(tx + px(8), jibBottom + px(8), px(3)).fill(CREAM);
  g.moveTo(tx, cableTopY).lineTo(f.hook.x, f.hook.y - px(10)).stroke({ width: px(3), color: INK });
  g.moveTo(tx, cableTopY).lineTo(f.hook.x, f.hook.y - px(10)).stroke({ width: px(1.2), color: 0xcfd6e6 });
  g.roundRect(f.hook.x - px(12), f.hook.y - px(12), px(24), px(9), px(2)).fill(YELLOW).stroke({ width: px(2), color: INK });
}
