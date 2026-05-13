'use client';
import { useEffect, useRef } from 'react';

export function BlastFxOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let appInstance: import('pixi.js').Application | null = null;

    (async () => {
      const PIXI = await import('pixi.js');
      if (cancelled) return;

      // Pixi v8: zero-arg constructor + await init(). v7's `new Application(opts)`
      // silently skips plugin setup, then destroy() crashes calling `_cancelResize`.
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
    })();

    return () => {
      cancelled = true;
      try {
        appInstance?.destroy(true, { children: true });
      } catch {
        // safe: app may not have finished init
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
