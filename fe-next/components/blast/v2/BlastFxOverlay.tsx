'use client';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { classifyOvation, type OvationTier } from '@/lib/blast/v2/engine';
import { ParticlePool, PhysicsWorld, PhysicsDebris, ScreenShake, ScoreFlyManager, ScreenFlash } from '@/lib/gameEngine';
import { TILE_EXPLOSION_VARIANTS, CASCADE_SPARKLE, CONFETTI_BURST, COMBO_FLASH, ELECTRIC_RINGS, GOLD_STARS, BLAST_LETTER_POP, BLAST_COMET_TRAIL } from '@/lib/gameEngine/presets/particles';
import styles from './BlastFxOverlay.module.css';

type Props = {
  chainEventKey?: number;
  chainDepth?: number;
  // Viewport-absolute centers (clientX/clientY from getBoundingClientRect).
  // FxOverlay subtracts its own canvas rect to land bursts on the cleared cell
  // regardless of canvas vs board size mismatch.
  clearCenters?: Array<{ x: number; y: number }>;
  clearEventKey?: number;
  onChainOvation?: (tier: OvationTier) => void;
  modeColor?: string;
};

interface Systems {
  app: import('pixi.js').Application;
  particles: ParticlePool;
  physics: PhysicsWorld;
  debris: PhysicsDebris;
  shake: ScreenShake;
  scoreFly: ScoreFlyManager;
  flash: ScreenFlash;
  bloom: import('pixi-filters').BloomFilter | null;
  rings: Array<{ g: import('pixi.js').Graphics; raf: number }>;
  // Flipped false on unmount. Each long-running closure (fade, lightSweep,
  // pulse-ring step) checks it before scheduling its next RAF so we don't
  // tick against a destroyed Pixi stage after fast navigation.
  live: { current: boolean };
  // RAF ids for the chain-ovation bloom fade and any other one-off animation
  // not already tracked in `rings`. Cancelled on unmount.
  rafs: Set<number>;
  // setTimeouts (e.g. the delayed second pulse ring on multi-tile clears)
  // cleared on unmount so they can't fire post-teardown.
  timeouts: Set<ReturnType<typeof setTimeout>>;
}

function pickExplosionVariant(): typeof TILE_EXPLOSION_VARIANTS[number] {
  const i = Math.floor(Math.random() * TILE_EXPLOSION_VARIANTS.length);
  return TILE_EXPLOSION_VARIANTS[i];
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// Bumped from 12 → 28 because shockwave wrap now fires on every cleared cell
// (was: first cell only). A 5-cell word produces ~25 ring graphics; the prior
// cap silently dropped most of them. Each ring is a tiny Graphics object so
// the pool size is still bounded.
const MAX_RINGS = 28;

// Helper accepting only the minimal liveness/tracking surface that the spawn
// closures need — keeps signatures narrow while letting unmount kill anything
// in flight.
type SpawnContext = {
  rings: Systems['rings'];
  live: Systems['live'];
};

// Expanding stroked ring — "shockwave footprint" on each clear / ovation.
// Skipped on prefers-reduced-motion.
async function spawnPulseRing(
  app: import('pixi.js').Application,
  systems: SpawnContext,
  cx: number,
  cy: number,
  color: number,
  scaleMul = 1,
) {
  if (typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!systems.live.current) return;
  if (systems.rings.length >= MAX_RINGS) return;
  const PIXI = await import('pixi.js');
  if (!systems.live.current) return; // unmounted while waiting on dynamic import
  const g = new PIXI.Graphics();
  const baseRadius = Math.min(app.screen.width, app.screen.height) * 0.12 * scaleMul;
  g.circle(0, 0, baseRadius).stroke({ color, width: 5, alpha: 1 });
  g.x = cx;
  g.y = cy;
  app.stage.addChild(g);

  const start = performance.now();
  const duration = 500;
  const entry = { g, raf: 0 };
  systems.rings.push(entry);
  const step = () => {
    if (!systems.live.current || g.destroyed) return;
    const t = Math.min((performance.now() - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    g.scale.set(0.4 + ease * 1.6);
    g.alpha = 1 - t;
    if (t >= 1) {
      try { app.stage.removeChild(g); } catch { /* ok */ }
      g.destroy();
      const idx = systems.rings.indexOf(entry);
      if (idx >= 0) systems.rings.splice(idx, 1);
      return;
    }
    entry.raf = requestAnimationFrame(step);
  };
  entry.raf = requestAnimationFrame(step);
}

// Chromatic shockwave wrap — three concentric rings in cyan/magenta/yellow
// staggered ~50ms apart with slight scale offsets. Reads as a glitch/sci-fi
// shockwave around the cleared cell, distinct from the solid pulse ring.
// Spawned in addition to the pulse ring on word found.
async function spawnShockwaveWrap(
  app: import('pixi.js').Application,
  systems: SpawnContext,
  cx: number,
  cy: number,
) {
  if (typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!systems.live.current) return;
  if (systems.rings.length >= MAX_RINGS) return;
  const PIXI = await import('pixi.js');
  if (!systems.live.current) return;
  // RGB-split shockwave: cyan slightly behind, yellow middle, magenta leading.
  const layers: Array<{ color: number; delayMs: number; scaleStart: number; width: number }> = [
    { color: 0x00ffff, delayMs: 0,   scaleStart: 0.35, width: 4 },
    { color: 0xffe135, delayMs: 60,  scaleStart: 0.32, width: 3 },
    { color: 0xff1493, delayMs: 120, scaleStart: 0.28, width: 3 },
  ];
  const t0 = performance.now();
  const baseRadius = Math.min(app.screen.width, app.screen.height) * 0.13;
  for (const layer of layers) {
    if (systems.rings.length >= MAX_RINGS) return;
    const g = new PIXI.Graphics();
    g.circle(0, 0, baseRadius).stroke({ color: layer.color, width: layer.width, alpha: 0.95 });
    g.x = cx;
    g.y = cy;
    g.scale.set(layer.scaleStart);
    g.alpha = 0;
    app.stage.addChild(g);

    const duration = 460;
    const entry = { g, raf: 0 };
    systems.rings.push(entry);
    const step = () => {
      if (!systems.live.current || g.destroyed) return;
      const now = performance.now();
      const localT = now - t0 - layer.delayMs;
      if (localT < 0) {
        entry.raf = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(localT / duration, 1);
      // ease-out cubic, expanding from scaleStart to 2.2
      const ease = 1 - Math.pow(1 - t, 3);
      g.scale.set(layer.scaleStart + ease * (2.2 - layer.scaleStart));
      // fade in fast, hold, then fade out
      g.alpha = t < 0.18 ? (t / 0.18) * 0.95 : 0.95 * (1 - (t - 0.18) / 0.82);
      if (t >= 1) {
        try { app.stage.removeChild(g); } catch { /* ok */ }
        g.destroy();
        const idx = systems.rings.indexOf(entry);
        if (idx >= 0) systems.rings.splice(idx, 1);
        return;
      }
      entry.raf = requestAnimationFrame(step);
    };
    entry.raf = requestAnimationFrame(step);
  }
}

// Horizontal luminous bar sweeping top→bottom — cinematic on big clears / chains.
async function spawnLightSweep(
  app: import('pixi.js').Application,
  systems: Pick<Systems, 'live' | 'rafs'>,
  color: number,
) {
  if (typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  if (!systems.live.current) return;
  const PIXI = await import('pixi.js');
  if (!systems.live.current) return;
  const g = new PIXI.Graphics();
  const barH = 8;
  g.rect(0, -barH / 2, app.screen.width, barH).fill({ color, alpha: 0.75 });
  g.y = -barH;
  app.stage.addChild(g);
  const start = performance.now();
  const duration = 480;
  let rafId = 0;
  const tick = () => {
    systems.rafs.delete(rafId);
    if (!systems.live.current || g.destroyed) return;
    const t = Math.min((performance.now() - start) / duration, 1);
    g.y = t * (app.screen.height + barH) - barH;
    g.alpha = 0.75 * (1 - t * t);
    if (t >= 1) {
      try { app.stage.removeChild(g); } catch { /* ok */ }
      g.destroy();
      return;
    }
    rafId = requestAnimationFrame(tick);
    systems.rafs.add(rafId);
  };
  rafId = requestAnimationFrame(tick);
  systems.rafs.add(rafId);
}

export function BlastFxOverlay({
  chainEventKey,
  chainDepth,
  clearCenters = [],
  clearEventKey,
  onChainOvation,
  modeColor = '#BFFF00',
}: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemsRef = useRef<Systems | null>(null);
  const lastClearKeyRef = useRef<number | undefined>(undefined);
  const lastChainKeyRef = useRef<number | undefined>(undefined);
  const [fxFailed, setFxFailed] = useState(false);
  const { t } = useLanguage();

  // Initialize Pixi + game systems. `resizeTo: canvas` makes Pixi keep its
  // renderer + app.screen synchronized with the canvas DOM size — without
  // this the screen defaulted to 800×600, putting bursts off-canvas.
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;

      const app = new PIXI.Application();
      try {
        await app.init({
          canvas,
          backgroundAlpha: 0,
          antialias: true,
          resizeTo: canvas,
          autoDensity: true,
          resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Blast FX overlay failed to initialize Pixi', err);
        setFxFailed(true);
        return;
      }

      if (cancelled) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // safe under fast unmount
        }
        return;
      }

      appInstance = app;

      // Gravity tuned for "real chunks of tile" feel — y=1.4 with default
      // scale 0.001 reads as roughly 1.4 px/ms² acceleration on debris,
      // which gives a satisfying weight without overshoot. Heavier than the
      // prior 400 because that was paired with a delta-units bug that fed
      // the solver ~0.016 ms/frame, undersampling gravity by 1000×.
      const physics = new PhysicsWorld({ gravity: { x: 0, y: 1.4 }, gravityScale: 0.001 });
      const particles = new ParticlePool(app.stage);
      const debris = new PhysicsDebris(app.stage, physics, {
        floorY: app.screen.height,
        maxDebris: 120,
        maxAge: 2.6,
        pieceSize: 8,
      });
      const shake = new ScreenShake();
      const scoreFly = new ScoreFlyManager(app.stage);
      const flash = new ScreenFlash(app.stage, app.screen.width, app.screen.height);

      // Chain-scaled bloom filter — disabled at rest, ramps with cascade depth
      // for that "screen-saturates" punch when chains stack.
      let bloom: import('pixi-filters').BloomFilter | null = null;
      try {
        const { BloomFilter } = await import('pixi-filters');
        bloom = new BloomFilter({ strength: 0, quality: 4 });
        const prev = Array.isArray(app.stage.filters) ? app.stage.filters : [];
        app.stage.filters = [...prev, bloom];
      } catch {
        // pixi-filters optional — skip bloom if import fails
      }

      systemsRef.current = {
        app, particles, physics, debris, shake, scoreFly, flash, bloom,
        rings: [],
        live: { current: true },
        rafs: new Set<number>(),
        timeouts: new Set<ReturnType<typeof setTimeout>>(),
      };

      const tick = (ticker: any) => {
        const deltaSec = ticker.deltaMS / 1000;
        // PhysicsWorld.update expects ms (Matter.js convention); everything
        // else takes seconds. Mixing these previously fed 0.016 to the
        // solver every frame, which made debris float instead of fall.
        physics.update(ticker.deltaMS);
        particles.update(deltaSec);
        debris.update(deltaSec);
        shake.update(deltaSec);
        scoreFly.update(deltaSec);
        flash.update(deltaSec);
        const offset = shake.offset;
        app.stage.x = offset.x;
        app.stage.y = offset.y;
      };
      app.ticker.add(tick);

      return () => {
        app.ticker.remove(tick);
        particles.destroy();
        debris.destroy();
        physics.destroy?.();
      };
    })();

    return () => {
      cancelled = true;
      const sys = systemsRef.current;
      if (sys) {
        // Flip live FIRST so any RAF callback that fires before we finish
        // tearing down sees the dead flag and bails out.
        sys.live.current = false;
        sys.timeouts.forEach((id) => clearTimeout(id));
        sys.timeouts.clear();
        sys.rafs.forEach((id) => cancelAnimationFrame(id));
        sys.rafs.clear();
        sys.rings.forEach((ring) => {
          if (ring.raf) cancelAnimationFrame(ring.raf);
        });
        sys.rings.length = 0;
      }
      systemsRef.current = null;
      try {
        appInstance?.destroy(true, { children: true });
      } catch {
        // safe: app may not have finished init
      }
    };
  }, []);

  // Handle clear event: burst particles + debris + shockwave + shake at each
  // cleared cell. Centers arrive viewport-absolute; subtract canvas rect to
  // land them on the right pixel.
  useEffect(() => {
    if (clearEventKey === undefined || clearEventKey === lastClearKeyRef.current) return;
    lastClearKeyRef.current = clearEventKey;
    const systems = systemsRef.current;
    if (!systems || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const { particles, debris, shake, flash, app } = systems;
    const tintColor = hexToNumber(modeColor);

    for (const center of clearCenters) {
      const lx = center.x - rect.left;
      const ly = center.y - rect.top;
      const variant = pickExplosionVariant();
      // Heavier per-cell burst tuned for "real impact". Tripled core counts
      // over the prior pass — playtest feedback was the bursts felt sparse
      // on phone screens where each tile is ~80px and any single particle
      // band looked thin. The bloom filter compresses density visually so
      // we need real volume to read.
      particles.burst(variant, lx, ly, 56);
      particles.burst(ELECTRIC_RINGS, lx, ly, 18);
      particles.burst(CASCADE_SPARKLE, lx, ly, 12);
      particles.burst(BLAST_LETTER_POP, lx, ly, 22);
      debris.spawn(lx, ly, tintColor, 28);
      // Radial explosion force gives the new debris pieces an outward kick
      // before gravity takes over — reads as a real shatter instead of a
      // gravity-only sprinkle.
      systems.physics.applyExplosion({ x: lx, y: ly }, 0.11, 220);
      // Dual-ring per cell — theme-tinted pulse + slightly larger white
      // afterglow. The pair reads as a primary detonation + secondary heat
      // shimmer; previously a single tinted ring blended into the bloom and
      // disappeared on bright themes (lime/cyan).
      spawnPulseRing(app, systems, lx, ly, tintColor, 1.15);
      // RGB-split shockwave wrap on word found — extra polish over the solid
      // pulse ring. Now fired on EVERY cell (was: first cell only) so the
      // shockwave reads as a chained explosion along the cleared path
      // instead of a single thump at the head. MAX_RINGS already caps
      // saturation so long words can't melt the pool.
      spawnShockwaveWrap(app, systems, lx, ly);
      // Delayed white afterglow ring — fires on every clear now (not just
      // multi-cell). Gives the percussive "thwip" follow-up that makes
      // single-tile pops feel as satisfying as multi-tile bursts.
      const handle = setTimeout(() => {
        systems.timeouts.delete(handle);
        if (!systems.live.current) return;
        spawnPulseRing(app, systems, lx, ly, 0xffffff, 0.85);
      }, 80);
      systems.timeouts.add(handle);
    }

    // Screen flash + shake scale with clear size. Bumped another tier — the
    // bloom filter eats low-intensity flashes so on bright themes you saw
    // nothing for small clears. Floor raised to 0.22 so even 1-cell pops
    // register, ceiling raised to 0.5 so 5+ clears truly punch.
    const n = clearCenters.length;
    if (n >= 5) {
      shake.heavy();
      flash.flash({ color: tintColor, intensity: 0.5, duration: 0.32 });
      spawnLightSweep(app, systems, tintColor);
      spawnLightSweep(app, systems, 0xffffff);
    } else if (n >= 3) {
      shake.medium();
      flash.flash({ color: tintColor, intensity: 0.36, duration: 0.24 });
      spawnLightSweep(app, systems, tintColor);
    } else if (n > 0) {
      shake.medium();
      flash.flash({ color: tintColor, intensity: 0.22, duration: 0.16 });
    }
  }, [clearEventKey, clearCenters, modeColor]);

  // Chain ovation: cascade tier → particle barrage + flash.
  useEffect(() => {
    if (chainEventKey === undefined || chainEventKey === lastChainKeyRef.current) return;
    lastChainKeyRef.current = chainEventKey;

    const tier = classifyOvation(chainDepth ?? 0);
    const canvas = canvasRef.current;
    if (tier !== 'none') {
      canvas?.setAttribute('data-ovation-tier', tier);
      onChainOvation?.(tier);
    } else {
      canvas?.removeAttribute('data-ovation-tier');
    }

    const systems = systemsRef.current;
    if (!systems) return;

    const { particles, app, shake, flash, bloom } = systems;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    const depth = chainDepth ?? 0;

    particles.burst(CASCADE_SPARKLE, centerX, centerY, 8 + depth * 6);
    if (depth >= 1) {
      particles.burst(COMBO_FLASH, centerX, centerY, 18);
    }
    // Bloom ramp — saturates the screen as chains stack, eases back to 0.
    // RAF id tracked so unmount cancels it; otherwise the closure kept ticking
    // and mutating a destroyed filter after fast navigation.
    if (bloom && depth >= 1) {
      const targetStrength = Math.min(0.6 + depth * 1.6, 6);
      bloom.strength = targetStrength;
      const start = performance.now();
      const fadeMs = 600 + depth * 120;
      let fadeRaf = 0;
      const fade = () => {
        systems.rafs.delete(fadeRaf);
        if (!systems.live.current) return;
        const t = Math.min((performance.now() - start) / fadeMs, 1);
        if (bloom) bloom.strength = targetStrength * (1 - t);
        if (t < 1) {
          fadeRaf = requestAnimationFrame(fade);
          systems.rafs.add(fadeRaf);
        }
      };
      fadeRaf = requestAnimationFrame(fade);
      systems.rafs.add(fadeRaf);
    }
    // Chain >= 2 → cinematic light sweep + comet trail across the board.
    if (depth >= 2) {
      spawnLightSweep(app, systems, 0xffffff);
      particles.burst(BLAST_COMET_TRAIL, centerX, centerY, 16);
    }
    if (tier === 'big') {
      particles.burst(GOLD_STARS, centerX, centerY, 28);
      shake.heavy();
      flash.flash({ color: 0xffe135, intensity: 0.34, duration: 0.32 });
      spawnPulseRing(app, systems, centerX, centerY, 0xffe135, 1.5);
    }
    if (tier === 'mega') {
      particles.burst(CONFETTI_BURST, centerX, centerY, 64);
      particles.burst(GOLD_STARS, centerX, centerY, 40);
      shake.heavy();
      flash.flash({ color: 0xff1493, intensity: 0.45, duration: 0.45 });
      spawnPulseRing(app, systems, centerX, centerY, 0xff1493, 2);
      spawnPulseRing(app, systems, centerX, centerY, 0x00ffff, 2.4);
    }
  }, [chainEventKey, chainDepth, onChainOvation]);

  return (
    <>
      <canvas
        ref={canvasRef}
        data-testid="blast-fx"
        className={`${styles.canvas} absolute inset-0 pointer-events-none`}
        // z-index 30 keeps bursts above the board (which sits at auto inside
        // a stacking context created by isolation: isolate). Earlier z=10
        // sometimes ended up painted under tile transforms during chains;
        // 30 leaves headroom for HUD/modals while keeping FX legible.
        style={{ zIndex: 30 }}
      />
      {fxFailed && (
        <div aria-live="polite" className="sr-only">
          {t('blast.fxFailed', 'Effects unavailable')}
        </div>
      )}
    </>
  );
}
