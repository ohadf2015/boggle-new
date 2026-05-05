'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface PracticePixiFxHandle {
  burst: (x: number, y: number) => void;
  shake: () => void;
  goalCelebrate: () => void;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Pixi overlay above the practice grid. Mounts a transparent canvas with
 * pointer-events:none, lifecycle managed via dynamic-import so SSR stays clean.
 * Skips Pixi entirely when prefers-reduced-motion is reduce.
 *
 * Particle implementation lives in usePracticeJuice — this component owns the
 * canvas + lifecycle; the juice hook drives effects.
 */
const PracticePixiFx = forwardRef<PracticePixiFxHandle, object>(function PracticePixiFx(_, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // appRef holds the Pixi.Application until we have its types — `unknown` keeps SSR clean.
  const appRef = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    (async () => {
      const { Application } = await import('pixi.js');
      if (cancelled) return;
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        resizeTo: containerRef.current ?? undefined,
      });
      if (cancelled) {
        app.destroy();
        return;
      }
      appRef.current = app as unknown as { destroy: () => void };
      containerRef.current?.appendChild(app.canvas);
    })();
    return () => {
      cancelled = true;
      const app = appRef.current;
      if (app) {
        app.destroy();
        appRef.current = null;
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    burst: () => { /* no-op: juice hook drives via DOM */ },
    shake: () => { /* no-op: juice hook drives via DOM */ },
    goalCelebrate: () => { /* no-op: juice hook drives via DOM */ },
  }), []);

  return (
    <div
      ref={containerRef}
      data-testid="practice-pixi-fx"
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    />
  );
});

export default PracticePixiFx;
