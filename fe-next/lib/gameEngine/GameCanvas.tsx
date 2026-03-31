// ─── Game Canvas ──────────────────────────────────────────────────────
// React component that initializes a PixiJS Application and provides
// the game loop, physics world, particle pool, and screen shake
// to children via context.

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Application, Container } from 'pixi.js';
import { PhysicsWorld } from './PhysicsWorld';
import { ParticlePool } from './ParticleSystem';
import { ScreenShake } from './ScreenShake';
import type { GameCanvasConfig, PhysicsConfig } from './types';

// ─── Context ──────────────────────────────────────────────────────────

export interface GameEngineContext {
  app: Application;
  stage: Container;
  /** Camera container — apply screen shake offset to this */
  camera: Container;
  physics: PhysicsWorld;
  particles: ParticlePool;
  shake: ScreenShake;
  /** Canvas dimensions */
  width: number;
  height: number;
}

const GameCtx = createContext<GameEngineContext | null>(null);

export function useGameEngine(): GameEngineContext {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGameEngine must be used within <GameCanvas>');
  return ctx;
}

// ─── Component ────────────────────────────────────────────────────────

interface GameCanvasProps {
  config: GameCanvasConfig;
  physicsConfig?: PhysicsConfig;
  children?: ReactNode;
  className?: string;
  /** Called each frame with delta in seconds */
  onTick?: (deltaSec: number) => void;
}

export function GameCanvas({
  config,
  physicsConfig,
  children,
  className,
  onTick,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngineContext | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    const app = new Application();

    const setup = async () => {
      await app.init({
        width: config.width,
        height: config.height,
        background: config.background,
        antialias: config.antialias ?? true,
        resolution: config.resolution ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      // Mount canvas
      container.appendChild(app.canvas);

      // Camera container for screen shake
      const camera = new Container();
      app.stage.addChild(camera);

      // Particle layer on top of camera
      const particleLayer = new Container();
      camera.addChild(particleLayer);

      // Physics
      const physics = new PhysicsWorld(
        physicsConfig ?? { gravity: { x: 0, y: 1 } },
      );

      // Particles
      const particles = new ParticlePool(particleLayer);

      // Screen shake
      const shake = new ScreenShake();

      // Game loop
      app.ticker.add((ticker) => {
        const deltaSec = ticker.deltaMS / 1000;

        // Update systems
        physics.update(ticker.deltaMS);
        particles.update(deltaSec);
        shake.update(deltaSec);

        // Apply screen shake to camera
        camera.x = shake.offset.x;
        camera.y = shake.offset.y;

        // User tick callback
        onTickRef.current?.(deltaSec);
      });

      const ctx: GameEngineContext = {
        app,
        stage: app.stage,
        camera,
        physics,
        particles,
        shake,
        width: config.width,
        height: config.height,
      };

      setEngine(ctx);
    };

    setup();

    return () => {
      destroyed = true;
      if (engine) {
        engine.particles.destroy();
        engine.physics.destroy();
        engine.shake.reset();
      }
      // Guard against PixiJS v8 _cancelResize race condition —
      // app.destroy() throws if init() hasn't completed yet.
      try {
        app.destroy(true, { children: true });
      } catch {
        // Silently handle — app was likely not fully initialized
      }
      // Remove canvas from DOM
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      setEngine(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.width, config.height, config.background]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: config.width,
        height: config.height,
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {engine && (
        <GameCtx.Provider value={engine}>
          {/* React overlay layer for HUD/UI, positioned over the canvas */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {children}
          </div>
        </GameCtx.Provider>
      )}
    </div>
  );
}
