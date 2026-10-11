// ─── SharedFxApp ──────────────────────────────────────────────────────
// Singleton PixiJS Application + ParticlePool bridge. One canvas,
// one GPU context, many effects. Call SharedFxApp.mount(el) once at
// app root, then SharedFxApp.spawnBurst(preset, x, y) from anywhere.

// pixi.js + ParticlePool are LAZY-LOADED inside mount() (dynamic import), NOT
// statically imported. SharedFxMount + GlobalCoinEarnFx mount this singleton from
// the GLOBAL essential-providers stack, so a static pixi import here would pull
// pixi.js (hundreds of KB) into the first-load JS of EVERY page — homepage, blog,
// legal — even though the GPU layer only ever mounts post-hydration, off native,
// and above the reduced-motion / zero-particle floor. Type-only imports keep the
// types (erased at build); the runtime classes load when (if) mount() fires.
// vi.mock('pixi.js') intercepts the dynamic import exactly as a static one.
import type { Application, Graphics } from 'pixi.js';
import type { ParticlePool } from '../gameEngine/ParticleSystem';
import type { ParticleConfig } from '../gameEngine/types';
import { PRESETS, type PresetName } from './presets';
import {
  dropHeldFxCalls,
  flushHeldFxCalls,
  holdFxCall,
  openFxGate,
  waitForFxGate,
} from './SharedFxGate';

// Runtime pixi.Graphics constructor, resolved during mount(). The spawn helpers
// that use it all early-return unless `app` is set (i.e. post-mount), so it is
// always populated by the time they run.
let GraphicsCtor: typeof import('pixi.js').Graphics | null = null;

// Memoized lazy loaders for the GPU stack. Concurrent mounts (React StrictMode
// double-invoke, route churn) share ONE in-flight import each instead of firing
// a separate pixi.js fetch per call — cheaper at runtime and gives the test's
// vi.mock a single import to intercept.
let pixiModulePromise: Promise<typeof import('pixi.js')> | null = null;
let particleSystemPromise: Promise<typeof import('../gameEngine/ParticleSystem')> | null = null;
const loadPixi = () => (pixiModulePromise ??= import('pixi.js'));
const loadParticleSystem = () =>
  (particleSystemPromise ??= import('../gameEngine/ParticleSystem'));

interface DeviceConfig {
  maxParticles: number;
  prefersReducedMotion: boolean;
}

interface SpawnOverrides {
  count?: number;
  colors?: string[];
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
let fireworkParticles: FireworkParticle[] = [];
// `live` gates the ticker so a late frame can't touch graphics mid/post-teardown
// (JAVASCRIPT-NEXTJS-13Y null-'x' class). `generation` lets a pending init detect
// that an unmount happened before it settled, so it discards instead of assigning
// a half-torn-down app (JAVASCRIPT-NEXTJS-15B _cancelResize class).
let live = false;
let generation = 0;
let resizeHandler: (() => void) | null = null;
// The GPU context lives while SharedFxMount holds it OR any fxLayer does. Only the
// root mount enables spawn*: it carries the native / low-end / calm-mode gating.
let rootHeld = false;
let layerHolds = 0;
// Per-frame callbacks from fxLayers; one returning false is dropped.
type FxWork = (deltaMS: number) => boolean;
const extraWork = new Set<FxWork>();

function isSSR(): boolean {
  return typeof window === 'undefined';
}

// True while any FX queue has work to animate. Drives ticker start/stop so the
// global rAF loop only runs when something is actually on screen.
function hasActiveFxWork(): boolean {
  return (
    fireworkParticles.length > 0 ||
    getActiveEmitterCount() > 0 ||
    extraWork.size > 0
  );
}

// Resume the rAF loop. Called after every spawn; the ticker self-stops via tickerFn
// once all queues drain. No-op if not mounted.
function wakeTicker(): void {
  app?.ticker.start();
}

async function mount(
  parent: HTMLElement,
  device: Partial<DeviceConfig> = {},
): Promise<void> {
  if (isSSR()) return;
  rootHeld = true;
  deviceConfig = { ...DEFAULT_DEVICE, ...device };
  return ensureMounted(parent);
}

async function ensureMounted(parent: HTMLElement): Promise<void> {
  if (app) return;
  if (mountPromise) return mountPromise;

  const myGeneration = ++generation;

  mountPromise = (async () => {
    // First-load gate (./SharedFxGate): while held, pixi waits for the visitor's
    // first interaction or first spawn instead of loading with the page.
    await waitForFxGate();
    if (myGeneration !== generation) return; // unmounted while waiting

    // Lazy-load the GPU stack here, off the first-load critical path. Both the
    // pixi runtime and ParticlePool (which itself statically imports pixi) are
    // pulled in only now, when a real mount is happening.
    const [pixi, particleSystem] = await Promise.all([
      loadPixi(),
      loadParticleSystem(),
    ]);
    GraphicsCtor = pixi.Graphics;
    const { ParticlePool } = particleSystem;

    const instance = new pixi.Application();
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
      updateFireworks(t.deltaMS);
      for (const work of [...extraWork]) if (!work(t.deltaMS)) extraWork.delete(work);
      // Idle-stop: once every queue has drained, halt the rAF loop. A free-running
      // ticker on this global singleton burned ~1.2–2.0s main-thread per 6s on an
      // idle homepage (high input_delay → "taps feel stuck"). Restarted by spawn*.
      if (!hasActiveFxWork()) instance.ticker.stop();
    };
    instance.ticker.add(tickerFn);
    // Start stopped — nothing to animate until the first spawn.
    instance.ticker.stop();

    resizeHandler = () => {
      instance.renderer?.resize?.(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);

    app = instance;
    live = true;
    flushHeldFxCalls();
  })();

  await mountPromise;
  mountPromise = null;
}

function unmount(): void {
  rootHeld = false;
  if (layerHolds > 0) return;
  teardown();
}

function teardown(): void {
  // Invalidate any in-flight mount so its init() discards instead of assigning,
  // and clear mountPromise so the next mount() starts fresh rather than awaiting
  // the discarded attempt (StrictMode mount→unmount→mount before init settles).
  generation++;
  mountPromise = null;
  live = false;
  dropHeldFxCalls();
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (!app) return;
  if (tickerFn) app.ticker.remove(tickerFn);
  clearFireworks();
  extraWork.clear();
  pool?.destroy();
  app.canvas.remove();
  app.destroy();
  app = null;
  pool = null;
  tickerFn = null;
  deviceConfig = DEFAULT_DEVICE;
}

/** Hold the GPU context for an fxLayer, mounting it if nothing else has. */
async function acquire(): Promise<Application | null> {
  if (isSSR()) return null;
  layerHolds++;
  openFxGate();
  try {
    await ensureMounted(document.body);
  } catch {
    // GPU init failed: the layer gets null and releases.
  }
  return app;
}

function release(): void {
  if (layerHolds === 0) return;
  layerHolds--;
  if (layerHolds === 0 && !rootHeld) teardown();
}

function addWork(work: FxWork): () => void {
  extraWork.add(work);
  wakeTicker();
  return () => {
    extraWork.delete(work);
  };
}

// Mount pending (first-use gate or GPU init): hold the spawn for replay.
function holdIfMounting(replay: () => void): void {
  if (mountPromise) holdFxCall(replay);
}

function spawnFirework(req: FireworkRequest): void {
  if (isSSR()) return;
  if (!rootHeld) return;
  if (!app) return holdIfMounting(() => spawnFirework(req));
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
  wakeTicker();
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
  const graphic = new GraphicsCtor!();
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
  if (isSSR()) return;
  if (!rootHeld) return;
  if (!pool) return holdIfMounting(() => spawnBurst(preset, x, y, overrides));
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
  wakeTicker();
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
  spawnFirework,
  isInitialized,
  getApplication,
  getDeviceConfig,
  getActiveEmitterCount,
  getActiveFireworkCount,
  acquire,
  release,
  addWork,
};

export type { DeviceConfig, SpawnOverrides, FireworkRequest };
