'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { useBoardCoords } from './hooks/useBoardCoords';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';

interface Props {
  boardRef: RefObject<HTMLElement | null>;
  reducedMotion: boolean;
  onReady?: (ctx: SceneCtx) => void;
}

export function WordCraftPixiStage({ boardRef, reducedMotion, onReady }: Props) {
  const canvasHolderRef = useRef<HTMLDivElement | null>(null);
  const coords = useBoardCoords(boardRef);

  useEffect(() => {
    if (!boardRef.current || !canvasHolderRef.current) return;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      try {
        const PIXI = await import('pixi.js');
        if (cancelled) return;
        const board = boardRef.current;
        if (!board) return;
        const rect = board.getBoundingClientRect();
        const app = new PIXI.Application();
        await app.init({
          width: rect.width || 320,
          height: rect.height || 320,
          backgroundAlpha: 0,
          antialias: true,
          resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
          autoDensity: true,
        });
        if (cancelled) {
          app.destroy(true);
          return;
        }
        const holder = canvasHolderRef.current;
        if (!holder) {
          app.destroy(true);
          return;
        }
        holder.appendChild(app.canvas);
        app.canvas.style.position = 'absolute';
        app.canvas.style.inset = '0';
        app.canvas.style.pointerEvents = 'none';

        const ambientLayer = new PIXI.Container();
        const eventLayer = new PIXI.Container();
        app.stage.addChild(ambientLayer);
        app.stage.addChild(eventLayer);

        const ctx: SceneCtx = { app, ambientLayer, eventLayer, coords, reducedMotion };
        onReady?.(ctx);

        const ro = new ResizeObserver(() => {
          const r = board.getBoundingClientRect();
          app.renderer.resize(r.width, r.height);
        });
        ro.observe(board);

        cleanup = () => {
          ro.disconnect();
          try {
            app.destroy({ removeView: true }, { children: true });
          } catch {
            // ignore double-destroy
          }
        };
      } catch (err) {
        // Pixi init failed (no WebGL, ancient device). Log via PostHog, degrade silently.
        if (typeof window !== 'undefined' && (window as any).posthog?.capture) {
          (window as any).posthog.capture('wordcraft_pixi_init_failed', {
            ua: navigator.userAgent,
            error: String(err),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [boardRef, coords, reducedMotion, onReady]);

  return (
    <div
      ref={canvasHolderRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
