'use client';
import { useEffect, useRef } from 'react';
import { classifyOvation, type OvationTier } from '@/lib/blast/v2/engine';
import { ParticlePool, PhysicsWorld, PhysicsDebris, ScreenShake, ScoreFlyManager, ScreenFlash } from '@/lib/gameEngine';
import { TILE_EXPLOSION_VARIANTS, CASCADE_SPARKLE, CONFETTI_BURST, COMBO_FLASH, ELECTRIC_RINGS, GOLD_STARS } from '@/lib/gameEngine/presets/particles';
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
}

function pickExplosionVariant(): typeof TILE_EXPLOSION_VARIANTS[number] {
  const i = Math.floor(Math.random() * TILE_EXPLOSION_VARIANTS.length);
  return TILE_EXPLOSION_VARIANTS[i];
}

function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
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
      } catch {
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

      const physics = new PhysicsWorld({ gravity: { x: 0, y: 400 }, gravityScale: 0.001 });
      const particles = new ParticlePool(app.stage);
      const debris = new PhysicsDebris(app.stage, physics, {
        floorY: app.screen.height,
        maxDebris: 80,
        maxAge: 2.4,
        pieceSize: 6,
      });
      const shake = new ScreenShake();
      const scoreFly = new ScoreFlyManager(app.stage);
      const flash = new ScreenFlash(app.stage, app.screen.width, app.screen.height);

      systemsRef.current = { app, particles, physics, debris, shake, scoreFly, flash };

      const tick = (ticker: any) => {
        const deltaSec = ticker.deltaMS / 1000;
        physics.update(deltaSec);
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
    const { particles, debris, shake, flash } = systems;
    const tintColor = hexToNumber(modeColor);

    for (const center of clearCenters) {
      const lx = center.x - rect.left;
      const ly = center.y - rect.top;
      const variant = pickExplosionVariant();
      particles.burst(variant, lx, ly, 14);
      particles.burst(ELECTRIC_RINGS, lx, ly, 3);
      debris.spawn(lx, ly, tintColor, 4);
    }

    // Screen flash + shake scale with clear size.
    const n = clearCenters.length;
    if (n >= 5) {
      shake.medium();
      flash.flash({ color: tintColor, intensity: 0.22, duration: 0.18 });
    } else if (n >= 3) {
      shake.light();
      flash.flash({ color: tintColor, intensity: 0.15, duration: 0.14 });
    } else if (n > 0) {
      shake.light();
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

    const { particles, app, shake, flash } = systems;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    const depth = chainDepth ?? 0;

    particles.burst(CASCADE_SPARKLE, centerX, centerY, 8 + depth * 6);
    if (depth >= 1) {
      particles.burst(COMBO_FLASH, centerX, centerY, 18);
    }
    if (tier === 'big') {
      particles.burst(GOLD_STARS, centerX, centerY, 22);
      shake.medium();
      flash.flash({ color: 0xffe135, intensity: 0.28, duration: 0.28 });
    }
    if (tier === 'mega') {
      particles.burst(CONFETTI_BURST, centerX, centerY, 50);
      particles.burst(GOLD_STARS, centerX, centerY, 30);
      shake.heavy();
      flash.flash({ color: 0xff1493, intensity: 0.38, duration: 0.4 });
    }
  }, [chainEventKey, chainDepth, onChainOvation]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-fx"
      className={`${styles.canvas} absolute inset-0 pointer-events-none`}
      style={{ zIndex: 10 }}
    />
  );
}
