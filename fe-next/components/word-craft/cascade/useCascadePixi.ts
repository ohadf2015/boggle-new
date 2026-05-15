'use client';
import { useEffect, useRef, type RefObject } from 'react';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import type { CascadeGrid } from '@/lib/word-craft/cascade/boardGrid';
import { coordsOf } from '@/lib/word-craft/cascade/boardGrid';

export interface UseCascadePixiArgs {
  sceneCtx: SceneCtx | null;
  grid: CascadeGrid;
  lastSubmit: {
    word: string;
    totalScore: number;
    burnedCellIds: string[];
    chainWords: string[];
  } | null;
  gameOver: boolean;
}

/**
 * Wires Pixi scenes to cascade state transitions. Imports each scene
 * lazily so missing Pixi (e.g. SSR, missing WebGL) silently degrades —
 * the CSS-only CascadeJuiceLayer keeps gameplay readable either way.
 */
export function useCascadePixi({ sceneCtx, grid, lastSubmit, gameOver }: UseCascadePixiArgs): void {
  const lastSubmitRef = useRef(lastSubmit);
  const gameOverFiredRef = useRef(false);

  // Burn + cascade scenes
  useEffect(() => {
    if (!sceneCtx || !lastSubmit || lastSubmit === lastSubmitRef.current) return;
    lastSubmitRef.current = lastSubmit;
    let cancelled = false;
    (async () => {
      try {
        const [ripple, confetti] = await Promise.all([
          import('@/lib/word-craft/pixi/scenes/tilePlaceRipple'),
          import('@/lib/word-craft/pixi/scenes/scoreConfetti'),
        ]);
        if (cancelled || !sceneCtx) return;
        // Ripple each burned cell
        for (const cellId of lastSubmit.burnedCellIds) {
          const coords = coordsOf(grid, cellId);
          if (!coords) continue;
          void ripple.playTilePlaceRipple(sceneCtx, coords);
        }
        // Score confetti for any chain combo
        if (lastSubmit.chainWords.length > 0) {
          void confetti.playScoreConfetti(sceneCtx);
        }
      } catch {
        /* missing module / Pixi error — fall back to CSS juice silently */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sceneCtx, lastSubmit, grid]);

  // Game-over burst
  useEffect(() => {
    if (!gameOver) {
      gameOverFiredRef.current = false;
      return;
    }
    if (!sceneCtx || gameOverFiredRef.current) return;
    gameOverFiredRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const m = await import('@/lib/word-craft/pixi/scenes/gameOverBurst');
        if (cancelled || !sceneCtx) return;
        void m.playGameOverBurst(sceneCtx);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameOver, sceneCtx]);
}
