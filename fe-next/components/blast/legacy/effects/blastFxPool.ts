/**
 * Pooled, transform-only sprite system for the Blast signature FX. Every shape
 * is drawn ONCE into a shared GraphicsContext; each live item only moves,
 * scales, rotates, tints and fades a pooled Graphics. No filters, no redraws,
 * one ticker callback for everything.
 */
import { Container, Graphics, GraphicsContext } from 'pixi.js';

export type FxShape = 'ring' | 'dot' | 'star' | 'coin' | 'band' | 'quad';

export interface FxSpawn {
  shape: FxShape;
  x: number;
  y: number;
  tint: number;
  life: number;
  delay?: number;
  vx?: number;
  vy?: number;
  gravity?: number;
  drag?: number;
  scale0?: number;
  scale1?: number;
  /** Non-uniform scale for bands/quads (multiplies x). */
  stretch?: number;
  alpha0?: number;
  alpha1?: number;
  rot?: number;
  vrot?: number;
  /** Cycle tint through the prism palette. */
  prism?: boolean;
  /** Coin face flip (scale.x oscillation). */
  spin?: boolean;
  /** Scale 0 → peak → 0 instead of a linear lerp. */
  twinkle?: boolean;
  /** Steer toward a point after `after` seconds (coin magnet). */
  magnet?: { x: number; y: number; after: number };
  add?: boolean;
}

interface FxItem extends Required<Omit<FxSpawn, 'magnet' | 'prism' | 'spin' | 'twinkle' | 'add' | 'stretch'>> {
  g: Graphics;
  age: number;
  stretch: number;
  prism: boolean;
  spin: boolean;
  twinkle: boolean;
  magnet: FxSpawn['magnet'];
}

const PRISM = [0x00ffff, 0x8b5cf6, 0xff1493, 0xffd700, 0xbfff00];

function buildContexts(): Record<FxShape, GraphicsContext> {
  const star = new GraphicsContext();
  star.poly([0, -10, 2.4, -2.4, 10, 0, 2.4, 2.4, 0, 10, -2.4, 2.4, -10, 0, -2.4, -2.4]).fill(0xffffff);
  return {
    ring: new GraphicsContext().circle(0, 0, 50).stroke({ width: 2.5, color: 0xffffff }),
    dot: new GraphicsContext().circle(0, 0, 4).fill(0xffffff),
    star,
    coin: new GraphicsContext()
      .circle(0, 0, 8).fill(0xffd700)
      .circle(0, 0, 8).stroke({ width: 2, color: 0xb8860b })
      .rect(-1.5, -4.5, 3, 9).fill(0xfff3b0),
    band: new GraphicsContext().rect(-0.5, -0.5, 1, 1).fill(0xffffff),
    quad: new GraphicsContext().rect(0, 0, 1, 1).fill(0xffffff),
  };
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export class FxPool {
  readonly layer = new Container();
  private readonly contexts = buildContexts();
  private readonly free: Record<FxShape, Graphics[]> = { ring: [], dot: [], star: [], coin: [], band: [], quad: [] };
  private readonly live: FxItem[] = [];
  cap = 240;

  constructor(parent: Container) {
    this.layer.eventMode = 'none';
    parent.addChild(this.layer);
  }

  get count(): number {
    return this.live.length;
  }

  spawn(s: FxSpawn): boolean {
    if (this.live.length >= this.cap || this.layer.destroyed) return false;
    let g = this.free[s.shape].pop();
    if (!g) {
      g = new Graphics(this.contexts[s.shape]);
      this.layer.addChild(g);
    }
    g.blendMode = s.add === false ? 'normal' : 'add';
    g.visible = false;
    this.live.push({
      g,
      shape: s.shape,
      x: s.x,
      y: s.y,
      tint: s.tint,
      life: s.life,
      delay: s.delay ?? 0,
      vx: s.vx ?? 0,
      vy: s.vy ?? 0,
      gravity: s.gravity ?? 0,
      drag: s.drag ?? 0,
      scale0: s.scale0 ?? 1,
      scale1: s.scale1 ?? s.scale0 ?? 1,
      stretch: s.stretch ?? 1,
      alpha0: s.alpha0 ?? 1,
      alpha1: s.alpha1 ?? 0,
      rot: s.rot ?? 0,
      vrot: s.vrot ?? 0,
      prism: !!s.prism,
      spin: !!s.spin,
      twinkle: !!s.twinkle,
      magnet: s.magnet,
      age: 0,
    });
    return true;
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const it = this.live[i];
      it.age += dt;
      const local = it.age - it.delay;
      if (local < 0) continue;
      const t = Math.min(1, local / it.life);
      if (t >= 1) {
        this.release(i);
        continue;
      }
      if (it.magnet && local > it.magnet.after) {
        const dx = it.magnet.x - it.x;
        const dy = it.magnet.y - it.y;
        const d = Math.hypot(dx, dy) || 1;
        const speed = 420 + 2800 * (local - it.magnet.after);
        const k = Math.min(1, 9 * dt);
        it.vx += ((dx / d) * speed - it.vx) * k;
        it.vy += ((dy / d) * speed - it.vy) * k;
      } else {
        it.vy += it.gravity * dt;
      }
      if (it.drag) {
        const k = Math.max(0, 1 - it.drag * dt);
        it.vx *= k;
        it.vy *= k;
      }
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.rot += it.vrot * dt;
      const g = it.g;
      g.visible = true;
      const s = it.twinkle
        ? it.scale1 * Math.sin(Math.PI * t)
        : it.scale0 + (it.scale1 - it.scale0) * easeOutCubic(t);
      g.scale.set(s * it.stretch * (it.spin ? Math.cos(local * 18) : 1), s);
      g.position.set(it.x, it.y);
      g.rotation = it.rot;
      g.alpha = it.alpha0 + (it.alpha1 - it.alpha0) * t;
      g.tint = it.prism ? PRISM[Math.floor(local * 14) % PRISM.length] : it.tint;
    }
  }

  clear(): void {
    for (let i = this.live.length - 1; i >= 0; i--) this.release(i);
  }

  destroy(): void {
    this.clear();
    if (!this.layer.destroyed) this.layer.destroy({ children: true });
    for (const c of Object.values(this.contexts)) c.destroy();
  }

  private release(i: number): void {
    const it = this.live[i];
    const last = this.live.pop()!;
    if (i < this.live.length) this.live[i] = last;
    it.g.visible = false;
    this.free[it.shape].push(it.g);
  }
}
