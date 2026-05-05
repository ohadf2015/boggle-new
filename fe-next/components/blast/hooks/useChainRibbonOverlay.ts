'use client';

import { useEffect } from 'react';
import type { Container } from 'pixi.js';
import { createChainRibbonController } from './useBlastPixiOverlays';

interface UseChainRibbonOverlayOpts {
  /** PIXI camera/stage container the ribbon attaches to. */
  camera: Container | null;
  /** PIXI Application — used to grab the canvas DOM element for coordinate translation. */
  app: { canvas?: HTMLCanvasElement } | null;
}

/**
 * Mounts the PIXI MeshRope chain ribbon and runs a RAF loop polling the
 * document for [data-blast-selected] tiles. Computes canvas-space points
 * and updates the controller every frame. Cheap: querySelectorAll on a
 * small grid + one getBoundingClientRect per selected tile.
 */
export function useChainRibbonOverlay({ camera, app }: UseChainRibbonOverlayOpts): void {
  useEffect(() => {
    if (!camera || !app) return;
    const canvasEl = app.canvas;
    if (!canvasEl) return;
    const ribbon = createChainRibbonController(camera);
    let raf = 0;
    const tick = (): void => {
      const tiles = document.querySelectorAll<HTMLElement>('[data-blast-selected]');
      if (tiles.length < 2) {
        ribbon.update([]);
      } else {
        const cRect = canvasEl.getBoundingClientRect();
        const pts: { x: number; y: number }[] = [];
        tiles.forEach((t) => {
          const r = t.getBoundingClientRect();
          pts.push({ x: r.left + r.width / 2 - cRect.left, y: r.top + r.height / 2 - cRect.top });
        });
        ribbon.update(pts);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ribbon.dispose();
    };
  }, [camera, app]);
}
