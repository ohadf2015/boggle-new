// ─── SharedFxApp ──────────────────────────────────────────────────────
// Singleton PixiJS Application + ParticlePool bridge. One canvas,
// one GPU context, many effects. Call SharedFxApp.mount(el) once at
// app root, then SharedFxApp.spawnBurst(preset, x, y) from anywhere.

import { Application, Graphics } from 'pixi.js';
import { ParticlePool } from '../gameEngine/ParticleSystem';
import type { ParticleConfig } from '../gameEngine/types';
import { PRESETS, type PresetName } from './presets';

interface DeviceConfig {
  maxParticles: number;
  prefersReducedMotion: boolean;
}

interface SpawnOverrides {
  count?: number;
  colors?: string[];
}

interface Point {
  x: number;
  y: number;
}

interface CoinStreamRequest {
  source: Point;
  target: Point;
  count: number;
  duration?: number;
}

interface CoinStream {
  graphic: Graphics;
  source: Point;
  control: Point;
  target: Point;
  elapsed: number;
  duration: number;
}

interface FireworkRequest {
  x: number;
  y: number;
  color: number;
  size: number;
  delayMs?: number;
}

interface FireworkParticle {
  graphic: Graphics;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  elapsed: number;
  duration: number;
  kind: 'flash' | 'radial' | 'trail';
}

const STREAM_DEFAULT_DURATION_MS = 900;
const STREAM_STAGGER_MS = 60;
const STREAM_RADIUS = 8;
const STREAM_COLOR = 0xffd700;

const FIREWORK_RADIAL_COUNT = 16;
const FIREWORK_TRAIL_COUNT = 8;
const FIREWORK_FLASH_DURATION_MS = 400;
const FIREWORK_RADIAL_DURATION_MS = 600;
const FIREWORK_TRAIL_DURATION_MS = 700;

const DEFAULT_DEVICE: DeviceConfig = {
  maxParticles: 20,
  prefersReducedMotion: false,
};

let app: Application | null = null;
let pool: ParticlePool | null = null;
let tickerFn: ((t: { deltaMS: number }) => void) | null = null;
let deviceConfig: DeviceConfig = DEFAULT_DEVICE;
let mountPromise: Promise<void> | null = null;
let coinStreams: CoinStream[] = [];
let fireworkParticles: FireworkParticle[] = [];
// `live` gates the ticker so a late frame can't touch graphics mid/post-teardown
// (JAVASCRIPT-NEXTJS-13Y null-'x' class). `generation` lets a pending init detect
// that an unmount happened before it settled, so it discards instead of assigning
// a half-torn-down app (JAVASCRIPT-NEXTJS-15B _cancelResize class).
let live = false;
let generation = 0;
let resizeHandler: (() => void) | null = null;

function isSSR(): boolean {
  return typeof window === 'undefined';
}

async function mount(
  parent: HTMLElement,
  device: Partial<DeviceConfig> = {},
): Promise<void> {
  if (isSSR()) return;
  if (app) return;
  if (mountPromise) return mountPromise;

  const myGeneration = ++generation;

  mountPromise = (async () => {
    deviceConfig = { ...DEFAULT_DEVICE, ...device };

    const instance = new Application();
    // NOTE: no `resizeTo` — it installs Pixi's ResizePlugin, whose destroy()
    // throws `_cancelResize is not a function` when teardown races init. We size
    // explicitly and drive resizes ourselves via the listener below.
    await instance.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // unmount() ran while init was pending → discard this instance, don't wire it.
    if (myGeneration !== generation) {
      try {
        instance.destroy(true, { children: true });
      } catch {
        // safe: instance may not be fully initialized under a fast unmount
      }
      return;
    }

    const canvas = instance.canvas;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    parent.appendChild(canvas);

    pool = new ParticlePool(instance.stage);

    tickerFn = (t: { deltaMS: number }) => {
      if (!live) return; // ignore frames once teardown has begun
      pool?.update(t.deltaMS / 1000);
      updateCoinStreams(t.deltaMS);
      updateFireworks(t.deltaMS);
    };
    instance.ticker.add(tickerFn);

    resizeHandler = () => {
      instance.renderer?.resize?.(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);

    app = instance;
    live = true;
  })();

  await mountPromise;
  mountPromise = null;
}

function unmount(): void {
  // Invalidate any in-flight mount so its init() discards instead of assigning,
  // and clear mountPromise so the next mount() starts fresh rather than awaiting
  // the discarded attempt (StrictMode mount→unmount→mount before init settles).
  generation++;
  mountPromise = null;
  live = false;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (!app) return;
  if (tickerFn) app.ticker.remove(tickerFn);
  clearCoinStreams();
  clearFireworks();
  pool?.destroy();
  app.canvas.remove();
  app.destroy();
  app = null;
  pool = null;
  tickerFn = null;
  deviceConfig = DEFAULT_DEVICE;
}

function computeControlPoint(source: Point, target: Point): Point {
  const dy = Math.abs(target.y - source.y);
  const arcHeight = Math.min(dy * 0.5, 100);
  return {
    x: (source.x + target.x) / 2,
    y: Math.min(source.y, target.y) - arcHeight,
  };
}

function spawnCoinStream(req: CoinStreamRequest): void {
  if (isSSR() || !app) return;
  if (deviceConfig.prefersReducedMotion) return;

  const capped = Math.min(req.count, deviceConfig.maxParticles);
  if (capped <= 0) return;

  const duration = req.duration ?? STREAM_DEFAULT_DURATION_MS;

  for (let i = 0; i < capped; i++) {
    // Per-coin scatter at the source, a jittered arc apex, varied size + speed.
    // The coins still converge on the exact target (the counter), but the path
    // looks alive and a little different every time — the casino "spray". Purely
    // cosmetic, so Math.random is fine (no determinism/leaderboard constraint).
    const coinSource = {
      x: req.source.x + (Math.random() - 0.5) * 48,
      y: req.source.y + (Math.random() - 0.5) * 48,
    };
    const control = computeControlPoint(coinSource, req.target);
    control.x += (Math.random() - 0.5) * 80;
    control.y -= Math.random() * 60;

    const radius = STREAM_RADIUS * (0.75 + Math.random() * 0.6); // ~6–11px

    const graphic = new Graphics();
    graphic.circle(0, 0, radius).fill(STREAM_COLOR);
    (graphic as unknown as { x: number }).x = coinSource.x;
    (graphic as unknown as { y: number }).y = coinSource.y;
    app.stage.addChild(graphic);

    coinStreams.push({
      graphic,
      source: coinSource,
      control,
      target: req.target,
      elapsed: -i * STREAM_STAGGER_MS - Math.random() * 40,
      duration: duration * (0.85 + Math.random() * 0.3),
    });
  }
}

function updateCoinStreams(deltaMS: number): void {
  if (!app || coinStreams.length === 0) return;

  const alive: CoinStream[] = [];
  for (const stream of coinStreams) {
    stream.elapsed += deltaMS;

    if (stream.elapsed < 0) {
      alive.push(stream);
      continue;
    }

    const t = Math.min(stream.elapsed / stream.duration, 1);
    const inv = 1 - t;
    const x =
      inv * inv * stream.source.x +
      2 * inv * t * stream.control.x +
      t * t * stream.target.x;
    const y =
      inv * inv * stream.source.y +
      2 * inv * t * stream.control.y +
      t * t * stream.target.y;

    const g = stream.graphic as unknown as { x: number; y: number; alpha: number };
    g.x = x;
    g.y = y;
    g.alpha = t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.2);

    if (t >= 1) {
      app.stage.removeChild(stream.graphic);
      stream.graphic.destroy();
    } else {
      alive.push(stream);
    }
  }
  coinStreams = alive;
}

function clearCoinStreams(): void {
  for (const stream of coinStreams) {
    if (app) app.stage.removeChild(stream.graphic);
    stream.graphic.destroy();
  }
  coinStreams = [];
}

function getActiveCoinStreamCount(): number {
  return coinStreams.length;
}

function spawnFirework(req: FireworkRequest): void {
  if (isSSR() || !app) return;
  if (deviceConfig.prefersReducedMotion) return;

  const cap = deviceConfig.maxParticles;
  if (cap <= 0) return;

  const flashBudget = Math.min(1, cap);
  const radialBudget = Math.min(FIREWORK_RADIAL_COUNT, cap - flashBudget);
  const trailBudget = Math.min(FIREWORK_TRAIL_COUNT, cap - flashBudget - radialBudget);

  const delay = req.delayMs ?? 0;
  const radius = req.size / 2;

  if (flashBudget > 0) addFireworkParticle('flash', req, 0, 0, FIREWORK_FLASH_DURATION_MS, delay);

  for (let i = 0; i < radialBudget; i++) {
    const angle = (i / FIREWORK_RADIAL_COUNT) * Math.PI * 2;
    const vx = (Math.cos(angle) * radius * 1000) / FIREWORK_RADIAL_DURATION_MS;
    const vy = (Math.sin(angle) * radius * 1000) / FIREWORK_RADIAL_DURATION_MS;
    addFireworkParticle('radial', req, vx, vy, FIREWORK_RADIAL_DURATION_MS, delay);
  }

  for (let i = 0; i < trailBudget; i++) {
    const angle = (i / FIREWORK_TRAIL_COUNT) * Math.PI * 2;
    const vx = (Math.cos(angle) * radius * 1.3 * 1000) / FIREWORK_TRAIL_DURATION_MS;
    const vy = (Math.sin(angle) * radius * 1.3 * 1000) / FIREWORK_TRAIL_DURATION_MS;
    addFireworkParticle('trail', req, vx, vy, FIREWORK_TRAIL_DURATION_MS, delay);
  }
}

function addFireworkParticle(
  kind: FireworkParticle['kind'],
  req: FireworkRequest,
  vx: number,
  vy: number,
  duration: number,
  delayMs: number,
): void {
  if (!app) return;
  const graphic = new Graphics();
  const size = kind === 'flash' ? req.size * 0.3 : kind === 'trail' ? 3 : 5;
  graphic.circle(0, 0, size).fill(req.color);
  const g = graphic as unknown as { x: number; y: number; alpha: number };
  g.x = req.x;
  g.y = req.y;
  g.alpha = 0;
  app.stage.addChild(graphic);

  fireworkParticles.push({
    graphic,
    originX: req.x,
    originY: req.y,
    vx,
    vy,
    elapsed: -delayMs,
    duration,
    kind,
  });
}

function updateFireworks(deltaMS: number): void {
  if (!app || fireworkParticles.length === 0) return;

  const alive: FireworkParticle[] = [];
  for (const p of fireworkParticles) {
    p.elapsed += deltaMS;

    const g = p.graphic as unknown as { x: number; y: number; alpha: number };

    if (p.elapsed < 0) {
      g.alpha = 0;
      alive.push(p);
      continue;
    }

    const t = Math.min(p.elapsed / p.duration, 1);
    const seconds = p.elapsed / 1000;

    g.x = p.originX + p.vx * seconds;
    g.y = p.originY + p.vy * seconds;

    if (p.kind === 'flash') {
      g.alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    } else {
      g.alpha = 1 - t;
    }

    if (t >= 1) {
      app.stage.removeChild(p.graphic);
      p.graphic.destroy();
    } else {
      alive.push(p);
    }
  }
  fireworkParticles = alive;
}

function clearFireworks(): void {
  for (const p of fireworkParticles) {
    if (app) app.stage.removeChild(p.graphic);
    p.graphic.destroy();
  }
  fireworkParticles = [];
}

function getActiveFireworkCount(): number {
  return fireworkParticles.length;
}

function spawnBurst(
  preset: string,
  x: number,
  y: number,
  overrides: SpawnOverrides = {},
): void {
  if (isSSR() || !pool) return;
  if (deviceConfig.prefersReducedMotion) return;

  const config = PRESETS[preset as PresetName];
  if (!config) {
    console.warn(`[SharedFxApp] Unknown preset: "${preset}"`);
    return;
  }

  const requested = overrides.count ?? config.particlesPerWave;
  const count = Math.min(requested, deviceConfig.maxParticles);

  const finalConfig: ParticleConfig = overrides.colors
    ? { ...config, colors: overrides.colors }
    : config;

  pool.burst(finalConfig, x, y, count);
}

function isInitialized(): boolean {
  return app !== null;
}

function getApplication(): Application | null {
  return app;
}

function getDeviceConfig(): DeviceConfig | null {
  return app ? deviceConfig : null;
}

function getActiveEmitterCount(): number {
  if (!pool) return 0;
  const emitters = (pool as unknown as { emitters: unknown[] }).emitters;
  return emitters?.length ?? 0;
}

export const SharedFxApp = {
  mount,
  unmount,
  spawnBurst,
  spawnCoinStream,
  spawnFirework,
  isInitialized,
  getApplication,
  getDeviceConfig,
  getActiveEmitterCount,
  getActiveCoinStreamCount,
  getActiveFireworkCount,
};

export type { DeviceConfig, SpawnOverrides, CoinStreamRequest, FireworkRequest };
