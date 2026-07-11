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
import { Application, Container, UPDATE_PRIORITY } from 'pixi.js';
import { PhysicsWorld } from './PhysicsWorld';
import { ParticlePool } from './ParticleSystem';
import { ScreenShake } from './ScreenShake';
import { ScreenFlash } from './ScreenFlash';
import { TimeDilation } from './TimeDilation';
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
  flash: ScreenFlash;
  timeDilation: TimeDilation;
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
  /** Set to false to skip Matter.js initialization (saves memory) */
  usePhysics?: boolean;
  children?: ReactNode;
  className?: string;
  /** Called each frame with delta in seconds */
  onTick?: (deltaSec: number) => void;
}

export function GameCanvas({
  config,
  physicsConfig,
  usePhysics: enablePhysics = true,
  children,
  className,
  onTick,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<GameEngineContext | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const engineRef = useRef<GameEngineContext | null>(null);

  // Initialize PixiJS Application once (not on every resize)
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
        backgroundAlpha: config.backgroundAlpha ?? 1,
        antialias: config.antialias ?? true,
        resolution: config.resolution ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      container.appendChild(app.canvas);

      // Pixi's TickerPlugin registers its OWN render-every-tick listener on
      // app.ticker (at UPDATE_PRIORITY.LOW), outside our control. Ticker._tick
      // never wraps its listener loop in try/catch, so if ANY listener throws
      // mid-frame — most often this internal render call hitting a Graphics/
      // Container a concurrent destroy() just nulled out — the exception
      // propagates out of _tick and Ticker never reaches the line that
      // reschedules its own requestAnimationFrame. The whole engine (physics,
      // particles, every consumer's own ticker.add callback) freezes dead for
      // the rest of the session, not just one dropped frame (Sentry 1RP: DAU
      // crash pattern, /:locale/word-tower — matches the 1CK/1CW/1PV destroy-
      // vs-render race class already hardened elsewhere in this engine). Swap
      // Pixi's raw listener for an identical one wrapped in try/catch, at the
      // same priority, so a lost frame can never take down the ticker.
      app.ticker.remove(app.render, app);
      app.ticker.add(() => {
        try { app.render(); } catch { /* post-destroy render race — skip this frame */ }
      }, app, UPDATE_PRIORITY.LOW);

      const camera = new Container();
      app.stage.addChild(camera);

      // Particle layer — added to camera but re-sorted to top after
      // children (like TileRenderer) attach. We use a high zIndex so
      // particles always render in front of game tiles.
      const particleLayer = new Container();
      particleLayer.zIndex = 1000;
      camera.addChild(particleLayer);
      camera.sortableChildren = true;

      const physics = enablePhysics
        ? new PhysicsWorld(physicsConfig ?? { gravity: { x: 0, y: 1 } })
        : (null as unknown as PhysicsWorld);

      const particles = new ParticlePool(particleLayer);
      const shake = new ScreenShake();

      // ScreenFlash layer — on top of everything in the stage
      const flash = new ScreenFlash(app.stage, config.width, config.height);
      const timeDilation = new TimeDilation();

      app.ticker.add((ticker) => {
        if (destroyed) return;
        // Same freeze risk as the render listener above: an uncaught throw
        // here (e.g. a subsystem touching an object a same-frame destroy()
        // just nulled, or a consumer's onTick) would stop this ticker from
        // ever rescheduling itself — try/catch turns that into one skipped
        // frame instead of a permanently dead engine.
        try {
          const rawDelta = ticker.deltaMS / 1000;
          // Apply time dilation to all game systems (not real-time UI)
          timeDilation.update(rawDelta);
          const deltaSec = timeDilation.apply(rawDelta);
          if (enablePhysics && physics) physics.update(deltaSec * 1000);
          particles.update(deltaSec);
          shake.update(rawDelta); // Shake uses real time for consistent feel
          flash.update(rawDelta); // Flash uses real time
          if (camera && !camera.destroyed && camera.position) {
            camera.x = shake.offset.x;
            camera.y = shake.offset.y;
          }
          onTickRef.current?.(deltaSec);
        } catch { /* post-destroy update race — skip this frame */ }
      });

      const ctx: GameEngineContext = {
        app, stage: app.stage, camera, physics, particles, shake, flash, timeDilation,
        width: config.width, height: config.height,
      };

      engineRef.current = ctx;
      setEngine(ctx);
    };

    setup();

    return () => {
      destroyed = true;
      // Stop Pixi's render ticker BEFORE tearing down subsystems. Otherwise the
      // internal render listener traverses a half-destroyed stage (flash/particle
      // Graphics already .destroy()'d) and calls .clear() on a nulled context →
      // "Cannot read properties of null (reading 'clear')" (Sentry 1CK).
      try { app.ticker?.stop(); } catch { /* */ }
      const eng = engineRef.current;
      if (eng) {
        try { eng.particles.destroy(); } catch { /* */ }
        if (enablePhysics && eng.physics) try { eng.physics.destroy(); } catch { /* */ }
        eng.shake.reset();
        try { eng.flash.destroy(); } catch { /* */ }
        eng.timeDilation.reset();
      }
      try { app.destroy(true, { children: true }); } catch { /* */ }
      while (container.firstChild) container.removeChild(container.firstChild);
      engineRef.current = null;
      setEngine(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.background]);

  // Resize the PixiJS renderer when dimensions change (no destroy/recreate)
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    try {
      eng.app.renderer.resize(config.width, config.height);
      eng.width = config.width;
      eng.height = config.height;
      eng.flash.resize(config.width, config.height);
    } catch { /* renderer may not be ready yet */ }
  }, [config.width, config.height]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: className?.includes('absolute') ? undefined : config.width,
        height: className?.includes('absolute') ? undefined : config.height,
        position: className?.includes('absolute') ? undefined : 'relative',
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
