'use client';
import { useEffect, useRef } from 'react';

export function BlastFxOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);

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
    })();

    return () => {
      cancelled = true;
      appInstance?.destroy(true, { children: true, texture: true });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="blast-fx"
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
