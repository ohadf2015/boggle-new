/**
 * Signature effect recipes for Blast: each special and each word size gets a
 * distinct, readable-at-a-glance look built from FxPool primitives. Counts are
 * passed through the governor so a struggling device sheds particles first.
 */
import { Graphics } from 'pixi.js';
import type { FxPool } from './blastFxPool';
import type { FxGovernor } from './blastFxGovernor';
import { CHAIN_EDGE_COLORS, chainFxStep, type WordFxIntensity } from './blastFxIntensity';

const LIME = 0xbfff00;
const PINK = 0xff1493;
const CYAN = 0x00ffff;
const PURPLE = 0x8b5cf6;
const GOLD = 0xffd700;
const ORANGE = 0xff8c1a;
const WHITE = 0xffffff;
const NEO_BURST = [LIME, PINK, CYAN, GOLD, PURPLE];

export interface SignatureFxDeps {
  pool: FxPool;
  gov: FxGovernor;
  width: number;
  height: number;
  cellSize: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function createSignatureFx({ pool, gov, width, height, cellSize }: SignatureFxDeps) {
  const ringScale = (cells: number) => (cells * cellSize) / 50;

  function ring(x: number, y: number, tint: number, cells: number, life: number, delay = 0, from = 0.15) {
    pool.spawn({ shape: 'ring', x, y, tint, life, delay, scale0: ringScale(from), scale1: ringScale(cells), alpha0: 1, alpha1: 0 });
  }

  function radial(x: number, y: number, n: number, opts: { tint: number[]; speed: [number, number]; shape?: 'dot' | 'star'; gravity?: number; life?: [number, number]; size?: number }) {
    const count = gov.scale(n);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
      const sp = rand(opts.speed[0], opts.speed[1]);
      pool.spawn({
        shape: opts.shape ?? 'dot',
        x,
        y,
        tint: opts.tint[i % opts.tint.length],
        life: rand(...(opts.life ?? [0.35, 0.6])),
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        gravity: opts.gravity ?? 0,
        drag: 3,
        scale0: opts.size ?? 1,
        scale1: 0.1,
        alpha0: 1,
        alpha1: 0.2,
        vrot: rand(-8, 8),
      });
    }
  }

  return {
    /** Shockwave ring pair + hot flash + ember spray. Shake/thump are fired by the caller. */
    bomb(x: number, y: number, power: number) {
      pool.spawn({ shape: 'quad', x: 0, y: 0, tint: 0xffe4f1, life: 0.14, scale0: height, stretch: width / height, alpha0: 0.22 + 0.18 * power, alpha1: 0 });
      ring(x, y, WHITE, 2.2 + power, 0.26);
      ring(x, y, PINK, 2.8 + 0.8 * power, 0.42, 0.05, 0.4);
      if (gov.allows('extra')) ring(x, y, ORANGE, 1.6, 0.3, 0.1, 0.2);
      radial(x, y, 14 + 8 * power, { tint: [ORANGE, PINK, GOLD, WHITE], speed: [260, 520], gravity: 520, life: [0.4, 0.75], size: 1.1 });
    },

    /** Gold burst whose coins arc up, then magnet toward the wallet counter. */
    coin(x: number, y: number, stackIndex: number, target: { x: number; y: number }) {
      ring(x, y, GOLD, 1.5, 0.3);
      const n = gov.scale(5 + Math.min(stackIndex, 3));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rand(-0.9, 0.9);
        const sp = rand(220, 380);
        pool.spawn({
          shape: 'coin',
          x,
          y,
          tint: WHITE,
          add: false,
          life: 1.1,
          delay: stackIndex * 0.075 + i * 0.025,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          gravity: 900,
          scale0: 1.25,
          scale1: 0.8,
          alpha0: 1,
          alpha1: 0.9,
          spin: true,
          magnet: { x: target.x, y: target.y, after: 0.22 },
        });
      }
      radial(x, y, 8, { tint: [GOLD, 0xfff3b0, WHITE], speed: [120, 260], shape: 'star', life: [0.3, 0.5], size: 0.8 });
    },

    /** Prismatic light sweep across the board + sparkle spiral. Hit-stop is fired by the caller. */
    diamond(x: number, y: number) {
      const diag = Math.hypot(width, height);
      const band = Math.max(cellSize * 0.55, 18);
      pool.spawn({ shape: 'band', x: -band, y: height / 2, tint: CYAN, prism: true, life: 0.42, vx: (width + band * 2) / 0.42, scale0: diag, stretch: band / diag, rot: 0.42, alpha0: 0.3, alpha1: 0.1 });
      pool.spawn({ shape: 'band', x: -band * 2, y: height / 2, tint: WHITE, life: 0.42, delay: 0.05, vx: (width + band * 3) / 0.42, scale0: diag, stretch: (band * 0.18) / diag, rot: 0.42, alpha0: 0.6, alpha1: 0.15 });
      ring(x, y, CYAN, 2.2, 0.4);
      const n = gov.scale(14);
      for (let i = 0; i < n; i++) {
        const a = i * 2.4;
        const sp = 60 + i * 14;
        pool.spawn({ shape: 'star', x, y, tint: WHITE, prism: true, life: 0.7, delay: i * 0.02, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 1.5, scale1: rand(0.9, 1.5), twinkle: true, vrot: 4 });
      }
    },

    /** Word-size scaled pop at the word centroid. */
    word(cx: number, cy: number, w: WordFxIntensity) {
      if (w.power >= 0.3) ring(cx, cy, LIME, 1.6 + 2.2 * w.power, 0.32 + 0.12 * w.power);
      if (w.power >= 0.6 && gov.allows('extra')) ring(cx, cy, WHITE, 1 + 1.5 * w.power, 0.26, 0.04);
      radial(cx, cy, Math.round(6 * w.particleScale), { tint: NEO_BURST, speed: [140, 260 + 220 * w.power], shape: 'star', size: 0.7 + 0.4 * w.power });
    },

    /** 7+ letter flourish: twin light streaks through the word + neo confetti fountain. */
    bigWord(cx: number, cy: number) {
      const h = Math.max(6, cellSize * 0.14);
      pool.spawn({ shape: 'band', x: -width * 0.5, y: cy, tint: LIME, life: 0.45, vx: width * 4, scale0: h, stretch: (width * 0.9) / h, alpha0: 0.9, alpha1: 0 });
      pool.spawn({ shape: 'band', x: width * 1.5, y: cy + h * 1.6, tint: PINK, life: 0.45, delay: 0.06, vx: -width * 4, scale0: h * 0.6, stretch: (width * 0.9) / (h * 0.6), alpha0: 0.9, alpha1: 0 });
      ring(cx, cy, WHITE, 3.5, 0.5, 0.05, 0.6);
      const n = gov.scale(22);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + rand(-0.75, 0.75);
        const sp = rand(380, 640);
        pool.spawn({ shape: i % 3 ? 'band' : 'star', x: cx, y: cy, tint: NEO_BURST[i % NEO_BURST.length], add: false, life: rand(0.8, 1.15), delay: 0.04 + i * 0.008, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, gravity: 1100, drag: 1.2, scale0: i % 3 ? 7 : 1, scale1: i % 3 ? 6 : 0.8, stretch: i % 3 ? 0.5 : 1, alpha0: 1, alpha1: 0.6, rot: rand(0, 6), vrot: rand(-14, 14) });
      }
    },

    /** One cascade step: escalating flare rings from the board centre. */
    chainStep(level: number) {
      const step = chainFxStep(level);
      for (let i = 0; i < step.rings; i++) {
        ring(width / 2, height / 2, CHAIN_EDGE_COLORS[i % CHAIN_EDGE_COLORS.length], 3 + i * 1.2, 0.5, i * 0.07, 0.5);
      }
    },

    /** Chain ended: one rung per level sweeps bottom → top, then a lime crown ring. */
    chainRelease(peak: number) {
      const rungs = Math.min(Math.max(peak, 2), 5);
      const h = Math.max(5, cellSize * 0.12);
      for (let i = 0; i < rungs; i++) {
        pool.spawn({ shape: 'band', x: width / 2, y: height + h, tint: CHAIN_EDGE_COLORS[i % CHAIN_EDGE_COLORS.length], life: 0.42, delay: i * 0.06, vy: -(height + 2 * h) / 0.42, scale0: h, stretch: width / h, alpha0: 0.75, alpha1: 0.35 });
      }
      ring(width / 2, height * 0.2, LIME, 4, 0.5, rungs * 0.06, 0.4);
    },

    /** Idle life on special tiles. */
    shimmer(x: number, y: number, type: 'bomb' | 'gold' | 'diamond') {
      const q = cellSize * 0.32;
      if (type === 'bomb') {
        for (let i = 0; i < 3; i++) {
          pool.spawn({ shape: 'dot', x: x + q, y: y - q, tint: i ? ORANGE : GOLD, life: 0.45, delay: i * 0.07, vx: rand(-30, 30), vy: rand(-90, -50), gravity: 140, scale0: 0.8, scale1: 0.2 });
        }
      } else if (type === 'gold') {
        pool.spawn({ shape: 'band', x: x - q, y, tint: WHITE, life: 0.5, vx: (q * 2) / 0.5, scale0: cellSize * 0.7, stretch: 4 / (cellSize * 0.7), rot: 0.6, alpha0: 0.6, alpha1: 0 });
      } else {
        pool.spawn({ shape: 'star', x: x + q * 0.8, y: y - q * 0.8, tint: WHITE, life: 0.7, scale1: 1.1, twinkle: true, vrot: 2, alpha0: 1, alpha1: 0.6 });
      }
    },
  };
}

export type SignatureFx = ReturnType<typeof createSignatureFx>;

/**
 * Glow halo under the dragged path. Redrawn only when the path
 * changes; the per-frame pulse is an alpha tweak.
 */
export function createPathGlow(parent: { addChild: (g: Graphics) => unknown }, cellSize: number) {
  const g = new Graphics();
  g.blendMode = 'add';
  parent.addChild(g);
  let len = 0;
  return {
    set(cells: readonly { row: number; col: number }[]) {
      len = cells.length;
      g.clear();
      if (len < 2) return;
      const pts = cells.map((c) => [c.col * cellSize + cellSize / 2, c.row * cellSize + cellSize / 2] as const);
      const tint = CHAIN_EDGE_COLORS[Math.min(Math.floor((len - 2) / 2), CHAIN_EDGE_COLORS.length - 1)];
      const trace = () => {
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      };
      // The board already draws the ink trail; this is only the halo that grows with the word.
      trace();
      g.stroke({ width: cellSize * (0.3 + Math.min(len, 8) * 0.04), color: tint, alpha: 0.16, cap: 'round', join: 'round' });
      trace();
      g.stroke({ width: cellSize * (0.14 + Math.min(len, 8) * 0.02), color: tint, alpha: 0.24, cap: 'round', join: 'round' });
    },
    pulse(time: number) {
      if (len >= 2) g.alpha = 0.75 + 0.25 * Math.sin(time * 10);
    },
    destroy() {
      if (!g.destroyed) g.destroy();
    },
  };
}
