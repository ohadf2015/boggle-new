'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';

interface BlastCascadeOverlayProps {
  /** Current cascade phase */
  phase: BlastCascadePhase;
  /** Animation data (cleared tiles, falling tiles, new tiles) */
  data: CascadeAnimationData | null;
  /** Grid dimensions */
  gridSize: number;
  /** Container width in pixels */
  containerWidth: number;
}

/**
 * BlastCascadeOverlay - Renders anime.js-powered cascade animations.
 *
 * During cascade phases, this overlay renders animated tile representations:
 * - clearing: cleared tiles scale up then shrink away with staggered rotation
 * - falling: surviving tiles slide down with smooth gravity easing
 * - appearing: new tiles pop in from above with subtle overshoot
 *
 * Uses anime.js for choreographed multi-element animation
 * that would be awkward with Framer Motion's per-element approach.
 */
export function BlastCascadeOverlay({
  phase,
  data,
  gridSize,
  containerWidth,
}: BlastCascadeOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cellSize = containerWidth / gridSize;

  // Run anime.js animations when phase changes
  useEffect(() => {
    if (!overlayRef.current || !data || phase === 'idle') return;

    const el = overlayRef.current;

    if (phase === 'clearing') {
      const clearTargets = el.querySelectorAll('.blast-cascade-clear');
      if (clearTargets.length > 0) {
        anime({
          targets: clearTargets,
          scale: [1, 1.15, 0],
          opacity: [1, 0.9, 0],
          rotate: anime.stagger([-8, 8]),
          duration: 250,
          easing: 'easeInQuart',
          delay: anime.stagger(20, { from: 'center' }),
        });
      }
    }

    if (phase === 'falling') {
      const fallTargets = el.querySelectorAll('.blast-cascade-fall');
      if (fallTargets.length > 0) {
        anime({
          targets: fallTargets,
          translateY: [
            function (el: Element) {
              const dist = Number((el as HTMLElement).dataset.fallDistance || 0);
              return -dist * cellSize;
            },
            0,
          ],
          duration: 320,
          easing: 'easeOutQuart',
          delay: anime.stagger(25, { from: 'last' }),
        });
      }
    }

    if (phase === 'appearing') {
      const newTargets = el.querySelectorAll('.blast-cascade-new');
      if (newTargets.length > 0) {
        anime({
          targets: newTargets,
          translateY: [
            function (el: Element) {
              const offset = Number((el as HTMLElement).dataset.spawnOffset || 1);
              return -offset * cellSize;
            },
            0,
          ],
          scale: [0.5, 1],
          opacity: [0, 1],
          duration: 260,
          easing: 'easeOutBack',
          delay: anime.stagger(30, { from: 'first' }),
        });
      }
    }
  }, [phase, data, cellSize]);

  if (!data || phase === 'idle') return null;

  const inset = 3;

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20">
      {/* Clearing phase: render ghost tiles at cleared positions that animate away */}
      {phase === 'clearing' && data.clearedTiles.map(tile => (
        <div
          key={`clear-${tile.row}-${tile.col}`}
          className="blast-cascade-clear absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient"
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tile.letter}
        </div>
      ))}

      {/* Falling phase: render tiles at their final positions with translateY offset */}
      {phase === 'falling' && data.fallingTiles.map(tile => (
        <div
          key={`fall-${tile.row}-${tile.col}`}
          className="blast-cascade-fall absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient"
          data-fall-distance={tile.fallDistance}
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tile.letter}
        </div>
      ))}

      {/* Appearing phase: new tiles pop in from above */}
      {phase === 'appearing' && data.newTiles.map(tile => (
        <div
          key={`new-${tile.row}-${tile.col}`}
          className="blast-cascade-new absolute flex items-center justify-center rounded-lg font-black text-neo-black letter-tile-gradient opacity-0"
          data-spawn-offset={tile.spawnOffset}
          style={{
            left: tile.col * cellSize + inset,
            top: tile.row * cellSize + inset,
            width: cellSize - inset * 2,
            height: cellSize - inset * 2,
            fontSize: cellSize * 0.45,
            border: '2px solid rgba(0,0,0,0.3)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {tile.letter}
        </div>
      ))}
    </div>
  );
}
