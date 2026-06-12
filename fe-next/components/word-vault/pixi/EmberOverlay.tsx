'use client';

import { useEffect, useRef } from 'react';

interface Props {
  /** Density (number of ember particles). Default 60. */
  density?: number;
  /** Color tint of the embers. Default warm orange. */
  tint?: number;
  /** Optional spark burst trigger — increment to spawn 30 sparks at given coords */
  burst?: { id: number; x: number; y: number };
  /** Whether the overlay should currently be active (false = render nothing) */
  active?: boolean;
  /** Intensity 0..1 — controls particle alpha + spawn rate. */
  intensity?: number;
}

/**
 * Pixi-powered ember/spark overlay. Sits transparent over the DOM scene.
 * Click-through (pointer-events: none) so the DOM scene remains interactive.
 */
export function EmberOverlay({
  density = 60,
  tint = 0xff8a3c,
  burst,
  active = true,
  intensity = 1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    destroyed: boolean;
    cleanup: (() => void) | null;
    addBurst: ((x: number, y: number) => void) | null;
  }>({ destroyed: false, cleanup: null, addBurst: null });

  // Init Pixi once on mount
  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    const state = stateRef.current;
    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;
      const app = new PIXI.Application();
      try {
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
          resizeTo: container,
        });
      } catch (e) {
        // Init can fail if container dimensions are 0; bail quietly
        return;
      }
      if (cancelled) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      // mount
      app.canvas.style.position = 'absolute';
      app.canvas.style.inset = '0';
      app.canvas.style.pointerEvents = 'none';
      container.appendChild(app.canvas);

      // Build a soft ember texture (single radial-gradient sprite, reused)
      const gfx = new PIXI.Graphics();
      const r = 12;
      gfx.circle(r, r, r).fill({ color: 0xffffff, alpha: 1 });
      // Pixi v8 generateCanvasTexture won't gradient — use multi-circle decay
      const innerGfx = new PIXI.Graphics();
      innerGfx.circle(r, r, r).fill({ color: 0xffffff, alpha: 0.15 });
      innerGfx.circle(r, r, r * 0.6).fill({ color: 0xffffff, alpha: 0.5 });
      innerGfx.circle(r, r, r * 0.3).fill({ color: 0xffffff, alpha: 1 });
      const texture = app.renderer.generateTexture(innerGfx);
      innerGfx.destroy();
      gfx.destroy();

      // Particle container
      const particles = new PIXI.ParticleContainer({
        dynamicProperties: {
          position: true,
          scale: true,
          rotation: false,
          color: true,
        },
      });
      app.stage.addChild(particles);

      type EmberData = {
        particle: InstanceType<typeof PIXI.Particle>;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        baseScale: number;
      };
      const embers: EmberData[] = [];

      const w = () => app.renderer.width / app.renderer.resolution;
      const h = () => app.renderer.height / app.renderer.resolution;

      const spawnEmber = (xOverride?: number, yOverride?: number, lifeMul = 1) => {
        const baseScale = 0.18 + Math.random() * 0.32;
        const particle = new PIXI.Particle({
          texture,
          x: xOverride ?? Math.random() * w(),
          y: yOverride ?? h() + 10,
          tint,
          scaleX: baseScale,
          scaleY: baseScale,
          alpha: 0,
        });
        particles.addParticle(particle);
        embers.push({
          particle,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(0.4 + Math.random() * 0.8),
          life: 1,
          maxLife: (4 + Math.random() * 4) * lifeMul,
          baseScale,
        });
      };

      // Initial drift population
      for (let i = 0; i < density; i += 1) {
        spawnEmber(Math.random() * w(), Math.random() * h());
      }

      // Spark burst handler — exposed via ref
      stateRef.current.addBurst = (x: number, y: number) => {
        for (let i = 0; i < 28; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + Math.random() * 3.5;
          const baseScale = 0.18 + Math.random() * 0.3;
          const particle = new PIXI.Particle({
            texture,
            x,
            y,
            tint: i % 5 === 0 ? 0xfff5d8 : 0xffd47a,
            scaleX: baseScale,
            scaleY: baseScale,
            alpha: 1,
          });
          particles.addParticle(particle);
          embers.push({
            particle,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 1,
            maxLife: 0.8 + Math.random() * 0.6,
            baseScale,
          });
        }
      };

      // Animation loop
      app.ticker.add((ticker) => {
        // Stop after teardown (don't touch removed particles) and while the tab
        // is hidden — this ambient ember field otherwise drifts at 60fps for the
        // whole session even when nobody can see it.
        if (state.destroyed) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        const dt = ticker.deltaTime;
        for (let i = embers.length - 1; i >= 0; i -= 1) {
          const e = embers[i];
          e.particle.x += e.vx * dt;
          e.particle.y += e.vy * dt;
          e.vy += 0.005 * dt; // soft buoyancy decay
          e.life -= (1 / 60) / e.maxLife * dt;

          // Fade in (first 10%) and fade out (last 30%)
          let alpha: number;
          if (e.life > 0.9) alpha = (1 - e.life) * 10;
          else if (e.life < 0.3) alpha = e.life / 0.3;
          else alpha = 1;
          e.particle.alpha = alpha * intensity * 0.85;

          // Subtle scale flicker
          const flick = 0.92 + Math.sin(e.life * 18) * 0.08;
          e.particle.scaleX = e.baseScale * flick;
          e.particle.scaleY = e.baseScale * flick;

          if (e.life <= 0 || e.particle.y < -20) {
            particles.removeParticle(e.particle);
            embers.splice(i, 1);
          }
        }

        // Maintain density (drift embers only — bursts handled separately)
        const ambientCount = embers.filter((e) => e.maxLife > 3).length;
        if (ambientCount < density) {
          spawnEmber();
        }
      });

      cleanupFn = () => {
        try {
          app.destroy(true, { children: true, texture: true });
        } catch {}
        try { texture.destroy(); } catch {}
      };
      stateRef.current.cleanup = cleanupFn;
    })();

    return () => {
      cancelled = true;
      state.destroyed = true;
      if (cleanupFn) cleanupFn();
      if (state.cleanup) state.cleanup();
      state.addBurst = null;
    };
  }, [active, density, tint, intensity]);

  // React to burst prop changes
  const lastBurstId = useRef(-1);
  useEffect(() => {
    if (!burst || burst.id === lastBurstId.current) return;
    lastBurstId.current = burst.id;
    stateRef.current.addBurst?.(burst.x, burst.y);
  }, [burst]);

  if (!active) return null;
  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
    />
  );
}
