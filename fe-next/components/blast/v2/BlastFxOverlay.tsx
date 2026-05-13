'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export function BlastFxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    // resizeTo crashes PIXI's resize plugin under reparenting; CSS sizes the
    // canvas visually, and backgroundAlpha:0 keeps the internal bitmap invisible.
    const app = new PIXI.Application({
      view: canvas,
      backgroundAlpha: 0,
      antialias: true,
    });
    appRef.current = app;
    return () => {
      try {
        app.destroy(false, { children: true });
      } catch {
        // PIXI sometimes throws on destroy under fast unmount; non-fatal.
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      data-testid="blast-fx"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
