'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useReducedMotion } from 'framer-motion';

type Props = { modeColor: string };

export function BlastAtmosphereOverlay({ modeColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      view: canvasRef.current,
      width: 400,
      height: 600,
      backgroundColor: 0x00000000,
      antialias: true,
    });
    appRef.current = app;

    // Spotlight glow (radial gradient)
    const spotLight = new PIXI.Graphics();
    spotLight.beginFill(parseInt(modeColor.replace('#', '0x')), 0.5);
    spotLight.drawCircle(200, 300, 200);
    spotLight.endFill();
    spotLight.filters = [new PIXI.BlurFilter(80)];
    app.stage.addChild(spotLight);

    // Ambient particles
    if (!prefersReducedMotion) {
      for (let i = 0; i < 4; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xffffff, 0.3);
        particle.drawCircle(0, 0, 3);
        particle.endFill();
        particle.x = Math.random() * 400;
        particle.y = Math.random() * 600;
        app.stage.addChild(particle);
      }
    }

    // Breathing animation (spotlight opacity)
    let time = 0;
    const tick = () => {
      time += 0.016;
      if (!prefersReducedMotion) {
        spotLight.alpha = 0.4 + Math.sin((time * 2 * Math.PI) / 3) * 0.075;
      }
    };
    app.ticker.add(tick);

    return () => {
      app.destroy();
    };
  }, [modeColor, prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-atmosphere"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
}
