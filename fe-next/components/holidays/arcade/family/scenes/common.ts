import type { Container, Sprite } from 'pixi.js';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { HolidayRegion } from '@/lib/holidays/region';
import { ART_H, ART_W, type KitCtx } from '../../kit/types';
import { neoColor, neoHex } from '../../kit/neoColor';

export interface TurnHud {
  score: number;
  left: number;
  combo: number;
  round?: number;
  lives?: number;
}

export interface TurnResult {
  score: number;
  won: boolean;
}

export interface TurnOpts {
  seed: number;
  seconds: number;
  region: HolidayRegion;
  say: (key: string, vars?: Record<string, string | number>) => string;
  hud: (h: TurnHud) => void;
  end: (r: TurnResult) => void;
  cheer: (line?: string) => void;
}

export function backdrop(ctx: KitCtx, name: string): Sprite {
  const bg = new ctx.pixi.Sprite(ctx.tex(name));
  bg.width = ART_W;
  bg.height = ART_H;
  bg.zIndex = -100;
  ctx.world.addChild(bg);
  return bg;
}

export function sprite(ctx: KitCtx, name: string, x: number, y: number, height: number, parent: Container = ctx.world): Sprite {
  const s = new ctx.pixi.Sprite(ctx.tex(name));
  s.anchor.set(0.5);
  const h = s.texture.height || height;
  s.scale.set(height / h);
  s.position.set(x, y);
  parent.addChild(s);
  return s;
}

export function glow(ctx: KitCtx, token: string, radius: number, parent: Container) {
  const g = new ctx.pixi.Graphics();
  const color = neoColor(token);
  for (let i = 6; i >= 1; i--) g.circle(0, 0, (radius * i) / 6).fill({ color, alpha: 0.07 });
  g.blendMode = 'add';
  parent.addChild(g);
  return g;
}

interface Flake {
  g: import('pixi.js').Graphics;
  vx: number;
  vy: number;
  spin: number;
}

export function ambience(ctx: KitCtx, kind: 'snow' | 'embers', count: number, area = { x: 0, y: 0, w: ART_W, h: ART_H }) {
  if (ctx.reduced) return () => {};
  const layer = new ctx.pixi.Container();
  layer.zIndex = 500;
  ctx.world.addChild(layer);
  const color = neoColor(kind === 'snow' ? 'neo-holiday-snow' : 'neo-holiday-gold');
  const flakes: Flake[] = Array.from({ length: count }, () => {
    const g = new ctx.pixi.Graphics().circle(0, 0, kind === 'snow' ? 3 + Math.random() * 5 : 2 + Math.random() * 3).fill({ color, alpha: kind === 'snow' ? 0.85 : 0.9 });
    if (kind === 'embers') g.blendMode = 'add';
    g.position.set(area.x + Math.random() * area.w, area.y + Math.random() * area.h);
    layer.addChild(g);
    return { g, vx: (Math.random() - 0.5) * 30, vy: kind === 'snow' ? 40 + Math.random() * 60 : -(30 + Math.random() * 50), spin: Math.random() * 6 };
  });
  let t = 0;
  return (dt: number) => {
    t += dt;
    for (const f of flakes) {
      f.g.x += (f.vx + Math.sin(t * 1.3 + f.spin) * 18) * dt;
      f.g.y += f.vy * dt;
      if (kind === 'embers') f.g.alpha = 0.4 + 0.5 * Math.abs(Math.sin(t * 2 + f.spin));
      if (f.g.y > area.y + area.h + 10) f.g.y = area.y - 10;
      if (f.g.y < area.y - 10) f.g.y = area.y + area.h;
      if (f.g.x < area.x - 10) f.g.x = area.x + area.w;
      if (f.g.x > area.x + area.w + 10) f.g.x = area.x;
    }
  };
}

export function burstPreset(tokens: string[], o: Partial<ParticleConfig> = {}): ParticleConfig {
  return {
    maxParticles: 24,
    frequency: 0.001,
    emitterLifetime: 0.1,
    particlesPerWave: 24,
    lifetime: { min: 0.35, max: 0.8 },
    speed: { min: 160, max: 520 },
    gravity: { x: 0, y: 900 },
    scale: { start: 2.2, end: 0.2 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: -360, max: 360 },
    colors: tokens.map((t) => neoHex(t)),
    spawnShape: 'burst',
    spawnConfig: { directions: 14 },
    ...o,
  };
}

export function popIn(ctx: KitCtx, s: Sprite, to: number, ms = 260) {
  if (ctx.reduced) {
    s.scale.set(to);
    return;
  }
  ctx.tweens.add({ from: 0, to, duration: ms / 1000, easing: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, onUpdate: (v) => s.scale.set(v) });
}

export function fadeAway(ctx: KitCtx, s: Sprite | Container, ms: number, rise = 0) {
  const y0 = s.y;
  ctx.tweens.add({
    from: 0, to: 1, duration: ms / 1000,
    onUpdate: (v) => {
      s.alpha = 1 - v;
      s.y = y0 - rise * v;
    },
    onComplete: () => s.destroy({ children: true }),
  });
}

export function squash(ctx: KitCtx, s: Container, base: number, amount = 0.18, ms = 220) {
  if (ctx.reduced) return;
  ctx.tweens.add({
    from: 1, to: 0, duration: ms / 1000,
    onUpdate: (v) => {
      const k = Math.sin(v * Math.PI) * amount;
      s.scale.set(base * (1 + k), base * (1 - k));
    },
    onComplete: () => s.scale.set(base),
  });
}

export function reporter(opts: TurnOpts) {
  let last = '';
  let ended = false;
  return {
    hud(h: TurnHud) {
      const key = `${h.score}|${h.left}|${h.combo}|${h.round}|${h.lives}`;
      if (key === last) return;
      last = key;
      opts.hud(h);
    },
    end(r: TurnResult) {
      if (ended) return;
      ended = true;
      opts.end(r);
    },
  };
}
