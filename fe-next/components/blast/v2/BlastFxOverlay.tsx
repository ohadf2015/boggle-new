'use client';
import { useEffect, useRef } from 'react';
import { classifyOvation, type OvationTier } from '@/lib/blast/v2/engine';
import { ParticlePool, PhysicsWorld, PhysicsDebris, ScreenShake, ScoreFlyManager } from '@/lib/gameEngine';
import { TILE_EXPLOSION, CASCADE_SPARKLE, CONFETTI_BURST } from '@/lib/gameEngine/presets/particles';
import styles from './BlastFxOverlay.module.css';

type Props = {
  chainEventKey?: number;
  chainDepth?: number;
  clearCenters?: Array<{ x: number; y: number }>;
  clearEventKey?: number;
  onChainOvation?: (tier: OvationTier) => void;
};

interface Systems {
  app: import('pixi.js').Application;
  particles: ParticlePool;
  physics: PhysicsWorld;
  debris: PhysicsDebris;
  shake: ScreenShake;
  scoreFly: ScoreFlyManager;
}

export function BlastFxOverlay({
  chainEventKey,
  chainDepth,
  clearCenters = [],
  clearEventKey,
  onChainOvation,
}: Props = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemsRef = useRef<Systems | null>(null);
  const lastClearKeyRef = useRef<number | undefined>(undefined);
  const lastChainKeyRef = useRef<number | undefined>(undefined);

  // Initialize Pixi + game systems
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;

      // Pixi v8: zero-arg constructor + await init()
      const app = new PIXI.Application();
      try {
        await app.init({
          canvas,
          backgroundAlpha: 0,
          antialias: true,
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

      // Create game systems
      const physics = new PhysicsWorld({ gravity: { x: 0, y: 400 }, gravityScale: 0.001 });
      const particles = new ParticlePool(app.stage);
      const debris = new PhysicsDebris(app.stage, physics, {
        floorY: app.screen.height,
        maxDebris: 60,
        maxAge: 2.0,
        pieceSize: 5,
      });
      const shake = new ScreenShake();
      const scoreFly = new ScoreFlyManager(app.stage);

      systemsRef.current = { app, particles, physics, debris, shake, scoreFly };

      // Ticker: advance physics, particles, debris, shake, scoreFly
      const tick = (ticker: any) => {
        const deltaSec = ticker.deltaMS / 1000;
        physics.update(deltaSec);
        particles.update(deltaSec);
        debris.update(deltaSec);
        shake.update(deltaSec);
        scoreFly.update(deltaSec);

        // Apply shake offset to stage
        const offset = shake.offset;
        app.stage.x = offset.x;
        app.stage.y = offset.y;
      };

      app.ticker.add(tick);

      // Cleanup on unmount
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

  // Handle clear event: burst particles and debris at each cleared cell center
  useEffect(() => {
    if (clearEventKey === undefined || clearEventKey === lastClearKeyRef.current) return;
    lastClearKeyRef.current = clearEventKey;

    const systems = systemsRef.current;
    if (!systems) return;

    const { particles, debris, shake } = systems;

    for (const center of clearCenters) {
      // Burst particles at cleared cell
      particles.burst(TILE_EXPLOSION, center.x, center.y, 12);
      // Spawn debris tumbling
      debris.spawn(center.x, center.y, 0xfff5e6, 3);
    }

    // Shake intensity based on number of cleared cells
    if (clearCenters.length >= 5) {
      shake.medium();
    } else if (clearCenters.length > 0) {
      shake.light();
    }
  }, [clearEventKey, clearCenters]);

  // Handle chain event: ovation tier + center bursts + attribute
  useEffect(() => {
    if (chainEventKey === undefined || chainEventKey === lastChainKeyRef.current) return;
    lastChainKeyRef.current = chainEventKey;

    const tier = classifyOvation(chainDepth ?? 0);
    const canvas = canvasRef.current;

    // Update HTML attribute for CSS animations
    if (tier !== 'none') {
      canvas?.setAttribute('data-ovation-tier', tier);
      onChainOvation?.(tier);
    } else {
      canvas?.removeAttribute('data-ovation-tier');
    }

    // Fire particle bursts if systems are ready
    const systems = systemsRef.current;
    if (!systems) return;

    const { particles, app } = systems;
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;

    // Base sparkle burst
    particles.burst(CASCADE_SPARKLE, centerX, centerY, 8 + (chainDepth ?? 0) * 6);

    // Mega tier gets extra confetti
    if (tier === 'mega') {
      particles.burst(CONFETTI_BURST, centerX, centerY, 40);
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
