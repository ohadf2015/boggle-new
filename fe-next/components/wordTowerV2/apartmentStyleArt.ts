import type { Graphics } from 'pixi.js';
import type { Rect } from '@/lib/wordTowerV2/apartment';
import type { TowerStyle } from '@/lib/wordTowerV2/towerStyle';

/**
 * The parts of an apartment floor that change with the workshop style
 * (towerStyle.ts): the wall's surface and the windows. apartmentArt.ts paints
 * everything else (shadow, cornice, sign, slab, outline) the same for all.
 * No soft gradients: every effect is a flat fill or a hard stroke.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;

type Px = (n: number) => number;

/** The wall between cornice and slab. `top`/`bottom` bound the patterned band. */
export function paintSurface(g: Graphics, style: TowerStyle, x: number, top: number, w: number, bottom: number, trim: number, px: Px): void {
  const h = bottom - top;
  switch (style.surface) {
    case 'brick':
      for (let cy = top + 6; cy < bottom; cy += 12) g.rect(x, cy, w, px(2));
      g.fill({ color: INK, alpha: 0.1 });
      return;
    case 'stone': {
      // Rusticated courses: deep bed joints, staggered head joints.
      let row = 0;
      for (let cy = top + 2; cy < bottom - 4; cy += 18, row += 1) {
        g.rect(x, cy, w, px(3));
        for (let cx = x + (row % 2 ? 14 : 28); cx < x + w - 6; cx += 28) g.rect(cx, cy, px(2.5), 18);
      }
      g.fill({ color: INK, alpha: 0.18 });
      return;
    }
    case 'fluted':
      // Art deco: pilaster flutes, and a chevron frieze under the cornice.
      for (let cx = x + 6; cx < x + w - 4; cx += 12) g.rect(cx, top, px(3), h);
      g.fill({ color: trim, alpha: 0.28 });
      for (let cx = x; cx < x + w - 10; cx += 14) g.poly([cx, top, cx + 7, top + 6, cx + 14, top, cx + 14, top + 3, cx + 7, top + 9, cx, top + 3]);
      g.fill(trim);
      return;
    case 'glass':
      // Curtain wall: spandrel lines and two hard sky reflections.
      for (let cy = top + 10; cy < bottom; cy += 22) g.rect(x, cy, w, px(2));
      g.fill({ color: INK, alpha: 0.25 });
      g.poly([x + w * 0.12, top, x + w * 0.2, top, x + w * 0.1, bottom, x + w * 0.02, bottom]);
      g.poly([x + w * 0.66, top, x + w * 0.7, top, x + w * 0.6, bottom, x + w * 0.56, bottom]);
      g.fill({ color: 0xffffff, alpha: 0.28 });
      return;
    case 'dark':
      // Neon: two tube strips along the floor, a fat dim stroke for the glow.
      for (const cy of [top + 4, bottom - 6]) {
        g.rect(x + 6, cy - px(3), w - 12, px(8)).fill({ color: trim, alpha: 0.25 });
        g.rect(x + 6, cy, w - 12, px(2.5)).fill(trim);
      }
      return;
    case 'columns':
      // Palace: fluted columns with capitals, every few windows.
      for (let cx = x + 10; cx < x + w - 14; cx += 44) {
        g.rect(cx, top + 4, 10, h - 4).fill(CREAM).stroke({ width: px(2), color: INK });
        g.rect(cx - 3, top, 16, 5).fill(trim).stroke({ width: px(2), color: INK });
      }
      return;
    case 'vines': {
      // Garden: leaves along the cornice and vines trailing down both ends.
      for (let cx = x + 6; cx < x + w - 4; cx += 11) g.circle(cx, top + 2 + ((cx * 7) % 5), 5);
      for (const vx of [x + 8, x + w - 8]) for (let vy = top + 8; vy < bottom - 6; vy += 9) g.circle(vx + (vy % 18 ? 2 : -2), vy, 4);
      g.fill(0x2fbf71);
      for (let cx = x + 12; cx < x + w - 4; cx += 33) g.circle(cx, top + 4, 2.6);
      g.fill(0xff7bb0);
      return;
    }
  }
}

function silhouette(g: Graphics, r: Rect): void {
  g.circle(r.x + r.w / 2, r.y + r.h * 0.42, r.w * 0.2).fill({ color: INK, alpha: 0.75 });
  g.roundRect(r.x + r.w * 0.22, r.y + r.h * 0.62, r.w * 0.56, r.h * 0.38, r.w * 0.2).fill({ color: INK, alpha: 0.75 });
}

function glint(g: Graphics, r: Rect): void {
  g.poly([r.x + r.w * 0.55, r.y, r.x + r.w * 0.8, r.y, r.x + r.w * 0.25, r.y + r.h, r.x, r.y + r.h]).fill({ color: CREAM, alpha: 0.16 });
}

/** One window in the style's shape. Lit = a tenant lives behind it. */
export function paintStyledWindow(g: Graphics, style: TowerStyle, r: Rect, lit: boolean, trim: number, px: Px): void {
  const pane = lit ? style.lit : style.glass;
  switch (style.window) {
    case 'arched': {
      const rad = r.w / 2;
      const body = { x: r.x, y: r.y + rad * 0.6, w: r.w, h: r.h - rad * 0.6 };
      g.rect(body.x - px(3), body.y, body.w + px(6), body.h + px(3)).fill(INK);
      g.circle(r.x + rad, body.y, rad + px(3)).fill(INK);
      g.rect(body.x, body.y, body.w, body.h).fill(pane);
      g.circle(r.x + rad, body.y, rad).fill(pane);
      if (lit) silhouette(g, body);
      // Keystone + sill.
      g.rect(r.x + rad - px(3), body.y - rad - px(4), px(6), px(6)).fill(CREAM);
      g.rect(r.x - px(4), r.y + r.h + px(2), r.w + px(8), px(4)).fill(CREAM);
      return;
    }
    case 'tall': {
      const t = { x: r.x + r.w * 0.15, y: r.y - 6, w: r.w * 0.7, h: r.h + 10 };
      g.rect(t.x - px(3), t.y - px(3), t.w + px(6), t.h + px(6)).fill(INK);
      g.rect(t.x, t.y, t.w, t.h).fill(pane);
      if (lit) silhouette(g, t);
      else glint(g, t);
      // Stepped deco cap.
      g.rect(t.x - px(2), t.y - px(7), t.w + px(4), px(4)).fill(trim);
      g.rect(t.x + t.w * 0.25, t.y - px(10), t.w * 0.5, px(3)).fill(trim);
      return;
    }
    case 'curtain':
      // Floor-to-floor glass: frameless panes, thin steel mullions.
      g.rect(r.x - 6, r.y - 4, r.w + 12, r.h + 8).fill(pane);
      if (lit) silhouette(g, r);
      g.rect(r.x - 6, r.y - 4, px(2), r.h + 8).fill({ color: INK, alpha: 0.6 });
      g.rect(r.x + r.w + 6 - px(2), r.y - 4, px(2), r.h + 8).fill({ color: INK, alpha: 0.6 });
      return;
    case 'neon':
      g.rect(r.x - px(4), r.y - px(4), r.w + px(8), r.h + px(8)).fill({ color: trim, alpha: lit ? 0.45 : 0.15 });
      g.rect(r.x, r.y, r.w, r.h).fill(pane).stroke({ width: px(2.5), color: trim });
      if (lit) silhouette(g, r);
      return;
    case 'round': {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const rad = Math.min(r.w, r.h) / 2;
      g.circle(cx, cy, rad + px(3)).fill(INK);
      g.circle(cx, cy, rad).fill(pane);
      if (lit) g.circle(cx, cy + rad * 0.15, rad * 0.35).fill({ color: INK, alpha: 0.7 });
      g.circle(cx, cy, rad).stroke({ width: px(2.5), color: trim });
      return;
    }
    default:
      g.rect(r.x - px(3), r.y - px(3), r.w + px(6), r.h + px(6)).fill(INK);
      g.rect(r.x, r.y, r.w, r.h).fill(pane);
      if (lit) silhouette(g, r);
      else glint(g, r);
      // Mullion + sill.
      g.rect(r.x + r.w / 2 - px(1), r.y, px(2), r.h).fill({ color: INK, alpha: 0.55 });
      g.rect(r.x - px(4), r.y + r.h + px(2), r.w + px(8), px(4)).fill(CREAM);
  }
}
