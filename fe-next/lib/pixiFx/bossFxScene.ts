/**
 * Projector boss FX, drawn as one layer on the shared FX canvas: word comets with trails, impact sparks and shockwaves, telegraph charge,
 * exposed sparks, phase/defeat bursts and a shared screen shake. Text stays in the DOM (RTL + webfonts), so word
 * labels are plain elements this scene moves along each comet's path.
 */
import type { Container, Graphics } from 'pixi.js';
import type { FxLayer, FxLayerContext } from './fxLayers';
import type { ParticleEmitter, ParticlePool, ScreenFlash, ScreenShake, TrailRenderer } from '@/lib/gameEngine';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { ClassroomBossAttackKind } from '@/shared/types/classroomBoss';

export interface BossFxLabels {
  layer: HTMLElement;
  wordClass: string;
  critWordClass: string;
  dmgClass: string;
  critDmgClass: string;
  critText: string;
  exposedText: string;
}

export interface BossFxHit {
  word: string;
  dmg: number;
  crit: boolean;
  exposed: boolean;
  slot: number;
}

/** Fractions of the stage: the class throws from the bottom and sides at the boss's chest. */
const TARGET = { x: 0.5, y: 0.44 };
const LAUNCH = [
  { x: 0.06, y: 0.98 }, { x: 0.94, y: 0.98 }, { x: 0.26, y: 1.04 },
  { x: 0.74, y: 1.04 }, { x: -0.02, y: 0.62 }, { x: 1.02, y: 0.62 },
];
const FLIGHT_S = 0.62;
const MAX_FLIGHTS = 10;
const MAX_POPS = 5;
const KIND_COLOR: Record<ClassroomBossAttackKind, string[]> = {
  freeze: ['88eeff', 'ffffff', '3fd8ff'],
  blur: ['c084fc', 'a855f6', 'ffffff'],
  drain: ['ff4fa3', 'ff2d6f', 'ffffff'],
};
const PHASE_EMBERS: string[][] = [
  ['7c5cff', '3fd8ff', 'b6a6ff'],
  ['ff4fa3', 'c084fc', 'ffd166'],
  ['ff2200', 'ff6600', 'ffaa00'],
];

type Engine = typeof import('@/lib/gameEngine');
type Presets = typeof import('@/lib/gameEngine/presets/particles');

interface Flight {
  from: { x: number; y: number };
  ctrl: { x: number; y: number };
  t: number;
  hit: BossFxHit;
  trail: TrailRenderer;
  head: Graphics;
  label: HTMLElement;
}

interface Ring {
  g: Graphics;
  t: number;
  dur: number;
  r0: number;
  r1: number;
  color: number;
  width: number;
}

export class BossFxScene implements FxLayer {
  private flights: Flight[] = [];
  private rings: Ring[] = [];
  private pool: ParticlePool;
  private shake: ScreenShake;
  private flash: ScreenFlash;
  private fx: Container;
  private ambient: ParticleEmitter | null = null;
  private charge: ParticleEmitter | null = null;
  private sparks: ParticleEmitter | null = null;
  private phase = 0;
  private pops: HTMLElement[] = [];
  private popSeq = 0;
  private dead = false;
  private destroyed = false;
  private PIXI: FxLayerContext['pixi'];
  private size = { w: 1, h: 1 };

  constructor(
    ctx: FxLayerContext,
    private E: Engine,
    private P: Presets,
    private labels: BossFxLabels,
    /** The stage box in viewport px: the shared canvas is fullscreen, the fight is a letterboxed 16:9 inside it. */
    private getRect: () => DOMRect | null,
    private onShake: (x: number, y: number) => void,
    private onImpact: (crit: boolean) => void,
  ) {
    this.PIXI = ctx.pixi;
    this.fx = ctx.container;
    this.readRect();
    this.pool = new E.ParticlePool(this.fx);
    this.shake = new E.ScreenShake();
    this.flash = new E.ScreenFlash(this.fx, this.w, this.h);
  }

  private get w() { return this.size.w; }
  private get h() { return this.size.h; }
  private readRect(): void {
    const r = this.getRect();
    if (!r || r.width < 1) return;
    if (r.width !== this.size.w || r.height !== this.size.h) {
      this.size = { w: r.width, h: r.height };
      this.flash?.resize(r.width, r.height);
    }
    this.origin = { x: r.left, y: r.top };
  }
  private origin = { x: 0, y: 0 };
  /** Presets are tuned for a ~1000px board; scale speed/spawn to this stage. */
  private u() { return Math.max(0.5, this.w / 1400); }
  private scaled(c: ParticleConfig, over: Partial<ParticleConfig> = {}): ParticleConfig {
    const u = this.u();
    const sc = c.spawnConfig;
    return {
      ...c,
      speed: { min: c.speed.min * u, max: c.speed.max * u },
      gravity: c.gravity && { x: c.gravity.x * u, y: c.gravity.y * u },
      spawnConfig: sc && { ...sc, radius: sc.radius && sc.radius * u, width: sc.width && sc.width * u, height: sc.height && sc.height * u },
      ...over,
    };
  }
  private target() { return { x: TARGET.x * this.w, y: TARGET.y * this.h }; }

  hit(hit: BossFxHit): void {
    if (this.dead) return;
    while (this.flights.length >= MAX_FLIGHTS) this.land(this.flights.shift()!, false);
    const L = LAUNCH[hit.slot % LAUNCH.length];
    const from = { x: L.x * this.w, y: L.y * this.h };
    const to = this.target();
    const ctrl = { x: (from.x + to.x) / 2 + (from.x < to.x ? -1 : 1) * this.w * 0.04, y: Math.min(from.y, to.y) - this.h * 0.06 };
    const color = hit.crit ? 0xff4fa3 : hit.exposed ? 0xffd166 : 0x3fd8ff;
    const tr = new this.E.TrailRenderer(this.fx, { color, glowColor: 0xffffff, maxAge: 0.22, maxWidth: (hit.crit ? 26 : 16) * this.u(), maxPoints: 24 });
    const head = new this.PIXI.Graphics()
      .circle(0, 0, (hit.crit ? 22 : 15) * this.u()).fill({ color, alpha: 0.35 })
      .circle(0, 0, (hit.crit ? 11 : 8) * this.u()).fill({ color: 0xffffff });
    head.blendMode = 'add';
    this.fx.addChild(head);
    const label = document.createElement('span');
    label.dir = 'auto';
    label.textContent = hit.word;
    label.className = hit.crit ? this.labels.critWordClass : this.labels.wordClass;
    this.labels.layer.appendChild(label);
    this.flights.push({ from, ctrl, t: 0, hit, trail: tr, head, label });
  }

  private land(f: Flight, impact: boolean): void {
    f.trail.destroy();
    f.head.destroy();
    f.label.remove();
    if (!impact) return;
    const { x, y } = this.target();
    const jx = x + (Math.random() - 0.5) * this.w * 0.06;
    const jy = y + (Math.random() - 0.5) * this.h * 0.08;
    const big = f.hit.crit || f.hit.exposed;
    this.pool.burst(this.scaled(big ? this.P.GOLD_STARS : this.P.BLAST_LETTER_POP), jx, jy, big ? 26 : 12);
    if (f.hit.crit) this.pool.burst(this.scaled(this.P.GEM_SHARD_BURST), jx, jy);
    this.ring(jx, jy, big ? 0.16 : 0.09, big ? 0xffd166 : 0xffffff, big ? 0.5 : 0.35, big ? 8 : 5);
    if (f.hit.crit) {
      this.shake.shake({ intensity: 14 * this.u(), duration: 0.35 });
      this.flash.flash({ color: 0xff4fa3, duration: 0.18, intensity: 0.22 });
    } else {
      this.shake.shake({ intensity: 5 * this.u(), duration: 0.16 });
    }
    this.popDamage(f.hit, x, y);
    this.onImpact(f.hit.crit);
  }

  /** Numbers fan out around the boss on a ring of slots, so a burst of hits never stacks into one smear. */
  private popDamage(hit: BossFxHit, x: number, y: number): void {
    while (this.pops.length >= MAX_POPS) this.pops.shift()!.remove();
    const angle = -Math.PI / 2 + ((this.popSeq++ % 7) - 3) * 0.42;
    const el = document.createElement('span');
    el.className = hit.crit ? this.labels.critDmgClass : this.labels.dmgClass;
    el.style.left = `${x + Math.cos(angle) * this.w * 0.12}px`;
    el.style.top = `${y + Math.sin(angle) * this.h * 0.2}px`;
    el.textContent = `-${hit.dmg}`;
    const tag = hit.crit ? this.labels.critText : hit.exposed ? this.labels.exposedText : '';
    if (tag) {
      const sub = document.createElement('span');
      sub.className = 'block text-[0.55em] text-neo-yellow';
      sub.textContent = tag;
      el.appendChild(sub);
    }
    this.labels.layer.appendChild(el);
    this.pops.push(el);
    window.setTimeout(() => {
      el.remove();
      this.pops = this.pops.filter((p) => p !== el);
    }, 1000);
  }

  private ring(x: number, y: number, r1Frac: number, color: number, dur: number, width: number): void {
    const g = new this.PIXI.Graphics();
    g.blendMode = 'add';
    g.position.set(x, y);
    this.fx.addChild(g);
    this.rings.push({ g, t: 0, dur, r0: this.w * 0.01, r1: this.w * r1Frac, color, width: width * this.u() });
  }

  setPhase(n: number): void {
    if (n === this.phase) return;
    const rising = this.phase > 0 && n > this.phase;
    this.phase = n;
    this.ambient?.stop();
    const base = n === 3 ? this.P.FIRE_EMBERS : this.P.AMBIENT_BOKEH;
    this.ambient = this.pool.create(this.scaled(base, {
      emitterLifetime: 0,
      frequency: n === 3 ? 0.06 : 0.12,
      particlesPerWave: 1,
      maxParticles: 40,
      lifetime: { min: 3, max: 6 },
      gravity: { x: 0, y: -(n === 3 ? 40 : 18) * this.u() },
      alpha: { start: 0.55, end: 0 },
      scale: { start: 0.6, end: 0.1 },
      colors: PHASE_EMBERS[n - 1],
      spawnShape: 'rect',
      spawnConfig: { width: this.w, height: this.h * 0.3 },
      blendMode: 'add',
    }));
    this.ambient.emit(this.w / 2, this.h * 0.92);
    if (rising) {
      const { x, y } = this.target();
      this.flash.flash({ color: n === 3 ? 0xff2200 : 0xff4fa3, duration: 0.4, intensity: 0.26 });
      this.ring(x, y, 0.6, n === 3 ? 0xff5533 : 0xff4fa3, 0.8, 14);
      this.pool.burst(this.scaled(this.P.VORTEX_EXPLOSION, { colors: PHASE_EMBERS[n - 1] }), x, y);
      this.shake.shake({ intensity: 22 * this.u(), duration: 0.6 });
    }
  }

  telegraph(kind: ClassroomBossAttackKind | null): void {
    this.charge?.stop();
    this.charge = null;
    if (!kind || this.dead) return;
    const { x, y } = this.target();
    this.charge = this.pool.create(this.scaled(this.P.VORTEX_PULL, { emitterLifetime: 0, colors: KIND_COLOR[kind], spawnConfig: { radius: 200 * this.u() } }));
    this.charge.emit(x, y);
  }

  exposed(on: boolean): void {
    this.sparks?.stop();
    this.sparks = null;
    if (!on || this.dead) return;
    const { x, y } = this.target();
    this.sparks = this.pool.create(this.scaled(this.P.ELECTRIC_RINGS, { emitterLifetime: 0, frequency: 0.08, colors: ['ffd166', 'ffffff', 'ffee88'] }));
    this.sparks.emit(x, y);
  }

  stagger(): void {
    const { x, y } = this.target();
    this.pool.burst(this.scaled(this.P.GOLD_STARS), x, y - this.h * 0.12, 30);
    this.ring(x, y, 0.3, 0xffd166, 0.6, 10);
    this.shake.shake({ intensity: 12 * this.u(), duration: 0.4 });
    this.flash.gold();
  }

  attack(kind: ClassroomBossAttackKind, blocked: boolean): void {
    const { x, y } = this.target();
    if (blocked) {
      const sx = this.w * 0.5;
      const sy = this.h * 0.78;
      this.ring(sx, sy, 0.22, 0x3fd8ff, 0.5, 10);
      this.pool.burst(this.scaled(this.P.ICE_SHATTER), sx, sy);
      this.flash.flash({ color: 0x3fd8ff, duration: 0.25, intensity: 0.25 });
      this.shake.shake({ intensity: 8 * this.u(), duration: 0.25 });
      return;
    }
    const color = parseInt(KIND_COLOR[kind][0], 16);
    this.ring(x, y, 0.75, color, 0.7, 18);
    this.pool.burst(this.scaled(kind === 'freeze' ? this.P.FROST_CRYSTALS : this.P.VORTEX_EXPLOSION, { colors: KIND_COLOR[kind] }), x, y, 40);
    this.flash.danger();
    this.shake.shake({ intensity: 26 * this.u(), duration: 0.7 });
  }

  defeat(): void {
    if (this.dead) return;
    this.dead = true;
    this.telegraph(null);
    this.exposed(false);
    for (const f of this.flights) this.land(f, false);
    this.flights = [];
    const { x, y } = this.target();
    const bursts = [0, 180, 380, 620, 900];
    bursts.forEach((ms, i) => window.setTimeout(() => {
      if (this.destroyed) return;
      const bx = x + (i === 0 ? 0 : (Math.random() - 0.5) * this.w * 0.3);
      const by = y + (i === 0 ? 0 : (Math.random() - 0.5) * this.h * 0.3);
      this.pool.burst(this.scaled(i === 0 ? this.P.GEM_GOLDEN_EXPLOSION : this.P.CONFETTI_BURST), bx, by);
      this.ring(bx, by, i === 0 ? 0.9 : 0.25, 0xffd166, 0.8, i === 0 ? 20 : 8);
      this.shake.shake({ intensity: (i === 0 ? 30 : 10) * this.u(), duration: 0.5 });
      if (i === 0) this.flash.flash({ color: 0xffffff, duration: 0.6, intensity: 0.7 });
    }, ms));
  }

  update(deltaMS: number): boolean {
    if (this.destroyed) return false;
    const dt = Math.min(0.05, deltaMS / 1000);
    this.readRect();
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i];
      f.t += dt / FLIGHT_S;
      if (f.t >= 1) {
        this.flights.splice(i, 1);
        this.land(f, true);
        continue;
      }
      // Ease in: words accelerate into the boss, so the impact reads as a hit, not a drift.
      const e = f.t * f.t * 0.7 + f.t * 0.3;
      const to = this.target();
      const a = (1 - e) * (1 - e);
      const b = 2 * (1 - e) * e;
      const c = e * e;
      const x = a * f.from.x + b * f.ctrl.x + c * to.x;
      const y = a * f.from.y + b * f.ctrl.y + c * to.y;
      f.trail.addPoint(x, y);
      f.head.position.set(x, y);
      f.label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -150%) scale(${1 - e * 0.35})`;
      f.label.style.opacity = String(Math.min(1, f.t * 6));
    }
    for (const f of this.flights) f.trail.update(dt);
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt / r.dur;
      if (r.t >= 1) {
        r.g.destroy();
        this.rings.splice(i, 1);
        continue;
      }
      const k = 1 - (1 - r.t) ** 3;
      r.g.clear().circle(0, 0, r.r0 + (r.r1 - r.r0) * k).stroke({ color: r.color, width: r.width * (1 - r.t), alpha: 1 - r.t });
    }
    this.pool.update(dt);
    this.flash.update(dt);
    this.shake.update(dt);
    const { x: sx, y: sy } = this.shake.offset;
    this.fx.position.set(this.origin.x + sx, this.origin.y + sy);
    this.onShake(sx, sy);
    return true;
  }

  destroy(): void {
    this.dead = true;
    this.destroyed = true;
    for (const f of this.flights) f.label.remove();
    for (const p of this.pops) p.remove();
    this.flights = [];
    this.pool.destroy();
    this.flash.destroy();
    this.onShake(0, 0);
  }
}
