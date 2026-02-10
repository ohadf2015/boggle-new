'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import { BLAST_ANIM, type BlastCascadePhase, type CascadeAnimationData } from './hooks/useBlastCascade';

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
 * - falling: surviving tiles slide down with gravity-proportional duration
 * - appearing: new tiles pop in from above with subtle overshoot
 *
 * Animation parameters stay synchronized with useBlastCascade via BLAST_ANIM config.
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
          scale: [1, 1.2, 0],
          opacity: [1, 1, 0],
          rotate: anime.stagger([-12, 12]),
          filter: ['brightness(1)', 'brightness(1.6)', 'brightness(0.5)'],
          duration: BLAST_ANIM.clear.duration,
          easing: BLAST_ANIM.clear.easing,
          delay: anime.stagger(BLAST_ANIM.clear.stagger, { from: 'center' }),
        });
      }
    }

    if (phase === 'falling') {
      const fallTargets = el.querySelectorAll('.blast-cascade-fall');
      if (fallTargets.length > 0) {
        // Per-element duration proportional to fall distance (simulates gravity)
        anime({
          targets: fallTargets,
          translateY: [
            function (el: Element) {
              const dist = Number((el as HTMLElement).dataset.fallDistance || 0);
              return -dist * cellSize;
            },
            0,
          ],
          duration: function (el: Element) {
            const dist = Number((el as HTMLElement).dataset.fallDistance || 1);
            return BLAST_ANIM.fall.baseDuration + dist * BLAST_ANIM.fall.perRowDuration;
          },
          easing: BLAST_ANIM.fall.easing,
          // No stagger — all tiles start falling at once (real gravity)
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
          duration: BLAST_ANIM.appear.duration,
          easing: BLAST_ANIM.appear.easing,
          delay: anime.stagger(BLAST_ANIM.appear.stagger, { from: 'first' }),
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

      {/* Falling phase: render tiles at final positions with translateY offset */}
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
            boxShadow: `0 ${Math.min(tile.fallDistance * 3, 12)}px ${Math.min(tile.fallDistance * 4, 16)}px rgba(0,0,0,0.2)`,
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
