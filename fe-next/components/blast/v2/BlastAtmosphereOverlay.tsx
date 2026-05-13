'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

type Props = { modeColor: string };

export function BlastAtmosphereOverlay({ modeColor }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled || !container) return;

      const app = new PIXI.Application();
      try {
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          width: 400,
          height: 600,
        });
      } catch {
        return;
      }
      if (cancelled) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      appInstance = app;
      app.canvas.style.position = 'absolute';
      app.canvas.style.inset = '0';
      app.canvas.style.pointerEvents = 'none';
      container.appendChild(app.canvas);

      // Spotlight glow (radial gradient via blur)
      const colorNum = parseInt(modeColor.replace('#', ''), 16);
      const spotLight = new PIXI.Graphics();
      spotLight.circle(200, 300, 200).fill({ color: colorNum, alpha: 0.5 });
      spotLight.filters = [new PIXI.BlurFilter({ strength: 80 })];
      app.stage.addChild(spotLight);

      // Ambient particles
      if (!prefersReducedMotion) {
        for (let i = 0; i < 4; i++) {
          const particle = new PIXI.Graphics();
          particle.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.3 });
          particle.x = Math.random() * 400;
          particle.y = Math.random() * 600;
          app.stage.addChild(particle);
        }
      }

      // Breathing animation
      let time = 0;
      const tick = () => {
        time += 0.016;
        if (!prefersReducedMotion) {
          spotLight.alpha = 0.4 + Math.sin((time * 2 * Math.PI) / 3) * 0.075;
        }
      };
      app.ticker.add(tick);
    })();

    return () => {
      cancelled = true;
      appInstance?.destroy(true, { children: true, texture: true });
    };
  }, [modeColor, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      data-testid="blast-atmosphere"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
