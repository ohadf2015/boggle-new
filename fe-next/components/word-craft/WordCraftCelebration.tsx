'use client';

import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export type CelebrationKind = 'bingo' | 'great' | 'gameOver' | 'overdrive' | 'burnout' | null;

/**
 * Perf gate: the particle ticker should idle (stop) only when there is nothing
 * left to animate — no live particles AND no rain shower still spawning. Pure +
 * exported so the decision is unit-testable without a WebGL context.
 */
export function shouldIdleParticleTicker(tileCount: number, rainActive: boolean): boolean {
  return tileCount === 0 && !rainActive;
}

export interface WordCraftCelebrationProps {
  kind: CelebrationKind;
  burstId: number;
  origin?: { x: number; y: number };
}

const TILE_TINTS = [0xbfff00, 0x00ffff, 0xff1493, 0xffe135];

export function WordCraftCelebration({ kind, burstId, origin }: WordCraftCelebrationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{
    spawnBurst: ((x: number, y: number, count: number) => void) | null;
    spawnRain: ((duration: number) => void) | null;
    spawnOverdriveBurst: ((x: number, y: number) => void) | null;
    cleanup: (() => void) | null;
    width: () => number;
    height: () => number;
  }>({ spawnBurst: null, spawnRain: null, spawnOverdriveBurst: null, cleanup: null, width: () => 0, height: () => 0 });

  // Hydration-safe reduced-motion (false on SSR + first client render, synced
  // post-mount) — was an inline useState(matchMedia) that diverged from SSR (#418).
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (reducedMotion) return;
    let cancelled = false;
    let cleanupFn: (() => void) | null = null;
    // True while a rain shower is still spawning tiles, so the idle gate doesn't
    // stop the ticker between incremental rain spawns.
    let rainActive = false;

    (async () => {
      const PIXI = await import('pixi.js');
      const container = containerRef.current;
      if (cancelled || !container) return;

      const app = new PIXI.Application();
      try {
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
          resizeTo: container,
        });
      } catch {
        return;
      }
      if (cancelled) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      app.canvas.style.position = 'absolute';
      app.canvas.style.inset = '0';
      app.canvas.style.pointerEvents = 'none';
      container.appendChild(app.canvas);

      const TILE = 18;
      const tileGfx = new PIXI.Graphics();
      tileGfx
        .rect(0, 0, TILE, TILE)
        .fill({ color: 0xffffff, alpha: 1 })
        .stroke({ color: 0x000000, width: 2, alignment: 1 });
      const tileTexture = app.renderer.generateTexture(tileGfx);
      tileGfx.destroy();

      const particles = new PIXI.ParticleContainer({
        dynamicProperties: { position: true, scale: true, rotation: true, color: false },
      });
      app.stage.addChild(particles);

      // Wake the render loop only while something is animating; the spawn helpers
      // call this, and the update ticker stops itself once everything clears.
      const wakeTicker = () => {
        if (!app.ticker.started) app.ticker.start();
      };

      type TileData = {
        particle: InstanceType<typeof PIXI.Particle>;
        vx: number;
        vy: number;
        vr: number;
        life: number;
        maxLife: number;
      };
      const tiles: TileData[] = [];

      const w = () => app.renderer.width / app.renderer.resolution;
      const h = () => app.renderer.height / app.renderer.resolution;
      apiRef.current.width = w;
      apiRef.current.height = h;

      const spawnTile = (
        x: number,
        y: number,
        vx: number,
        vy: number,
        maxLife: number,
        scale: number,
      ) => {
        const tint = TILE_TINTS[Math.floor(Math.random() * TILE_TINTS.length)];
        const particle = new PIXI.Particle({
          texture: tileTexture,
          x,
          y,
          tint,
          scaleX: scale,
          scaleY: scale,
          rotation: Math.random() * Math.PI * 2,
          alpha: 1,
        });
        particles.addParticle(particle);
        tiles.push({
          particle,
          vx,
          vy,
          vr: (Math.random() - 0.5) * 0.18,
          life: 1,
          maxLife,
        });
      };

      apiRef.current.spawnBurst = (x: number, y: number, count: number) => {
        wakeTicker();
        for (let i = 0; i < count; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 6;
          spawnTile(
            x,
            y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed - 2,
            1.4 + Math.random() * 0.6,
            0.9 + Math.random() * 0.7,
          );
        }
      };

      apiRef.current.spawnRain = (duration: number) => {
        wakeTicker();
        rainActive = true;
        const startedAt = performance.now();
        let lastSpawn = startedAt;
        const rainTicker = (ticker: { deltaTime: number }) => {
          const now = performance.now();
          if (now - startedAt > duration) {
            rainActive = false;
            app.ticker.remove(rainTicker);
            return;
          }
          if (now - lastSpawn > 35) {
            const count = 1 + Math.floor(ticker.deltaTime);
            for (let i = 0; i < count; i += 1) {
              spawnTile(
                Math.random() * w(),
                -20,
                (Math.random() - 0.5) * 0.6,
                2.4 + Math.random() * 1.6,
                3.2 + Math.random() * 0.8,
                0.7 + Math.random() * 0.6,
              );
            }
            lastSpawn = now;
          }
        };
        app.ticker.add(rainTicker);
      };

      apiRef.current.spawnOverdriveBurst = (x: number, y: number) => {
        wakeTicker();
        for (let i = 0; i < 120; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 4 + Math.random() * 8
          const particle = new PIXI.Particle({
            texture: tileTexture,
            x,
            y,
            tint: 0xbfff00,
            scaleX: 0.7 + Math.random() * 0.5,
            scaleY: 0.7 + Math.random() * 0.5,
            rotation: Math.random() * Math.PI * 2,
            alpha: 1,
          })
          particles.addParticle(particle)
          tiles.push({
            particle,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            vr: (Math.random() - 0.5) * 0.2,
            life: 1,
            maxLife: 1.2 + Math.random() * 0.5,
          })
        }
      };

      app.ticker.add((ticker) => {
        const dt = ticker.deltaTime;
        for (let i = tiles.length - 1; i >= 0; i -= 1) {
          const t = tiles[i];
          t.particle.x += t.vx * dt;
          t.particle.y += t.vy * dt;
          t.vy += 0.18 * dt;
          t.particle.rotation += t.vr * dt;
          t.life -= (1 / 60) / t.maxLife * dt;
          t.particle.alpha = t.life > 0.2 ? 1 : t.life / 0.2;
          if (t.life <= 0 || t.particle.y > h() + 40) {
            particles.removeParticle(t.particle);
            tiles.splice(i, 1);
          }
        }
        // Idle the render loop once everything has cleared — saves continuous
        // CPU/GPU/battery on phone + TV while the player is just thinking.
        if (shouldIdleParticleTicker(tiles.length, rainActive)) {
          app.ticker.stop();
        }
      });

      // Start idle: nothing is animating until the first spawn wakes the ticker.
      app.ticker.stop();

      cleanupFn = () => {
        try {
          app.destroy(true, { children: true, texture: true });
        } catch {}
        try {
          tileTexture.destroy();
        } catch {}
      };
      apiRef.current.cleanup = cleanupFn;
    })();

    const apiSnapshot = apiRef.current;
    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
      if (apiSnapshot.cleanup) apiSnapshot.cleanup();
      apiSnapshot.spawnBurst = null;
      apiSnapshot.spawnRain = null;
      apiSnapshot.spawnOverdriveBurst = null;
      apiSnapshot.cleanup = null;
    };
  }, [reducedMotion]);

  const lastBurstId = useRef(-1);
  useEffect(() => {
    if (reducedMotion) return;
    if (kind === null) return;
    if (burstId === lastBurstId.current) return;
    lastBurstId.current = burstId;

    // Track the pending retry so we can cancel it on unmount. Without this,
    // the timer outlives the test environment and throws "window is not defined"
    // when happy-dom tears down while the retry is still pending.
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const tryFire = (attempt: number) => {
      const api = apiRef.current;
      if (!api.spawnBurst || !api.spawnRain) {
        if (attempt < 20) {
          retryTimer = setTimeout(() => tryFire(attempt + 1), 50);
        }
        return;
      }
      retryTimer = null;
      if (kind === 'bingo') {
        const x = origin?.x ?? api.width() / 2;
        const y = origin?.y ?? api.height() / 2;
        api.spawnBurst(x, y, 80);
      } else if (kind === 'great') {
        // Lighter mid-game pop for big words / steals / streaks — half the
        // particles of a bingo so it rewards without stealing the bingo's thunder.
        const x = origin?.x ?? api.width() / 2;
        const y = origin?.y ?? api.height() / 2;
        api.spawnBurst(x, y, 40);
      } else if (kind === 'gameOver') {
        api.spawnBurst(api.width() / 2, api.height() / 3, 60);
        api.spawnRain(2800);
      } else if (kind === 'overdrive') {
        const x = origin?.x ?? api.width() / 2
        const y = origin?.y ?? api.height() * 0.85
        api.spawnOverdriveBurst?.(x, y)
      } else if (kind === 'burnout') {
        api.spawnBurst?.(api.width() / 2, api.height() / 2, 30)
      }
    };
    tryFire(0);

    return () => {
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [kind, burstId, origin, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      data-testid="word-craft-celebration"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    />
  );
}
