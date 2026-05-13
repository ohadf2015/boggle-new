'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';

export function BlastFxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement ?? undefined;
    const app = new PIXI.Application({
      view: canvas,
      resizeTo: parent,
      backgroundAlpha: 0,
      antialias: true,
    });
    appRef.current = app;
    return () => {
      app.destroy();
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
