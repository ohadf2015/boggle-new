'use client';

import { useEffect, useRef } from 'react';
import anime from 'animejs';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';

interface BlastCascadeOverlayProps {
  /** Current cascade phase */
  phase: BlastCascadePhase;
  /** Animation data (falling tiles, new tiles) */
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
 * - clearing: tiles shrink with particle burst
 * - falling: tiles slide down with spring easing
 * - appearing: new tiles pop in from above with stagger
 *
 * Uses anime.js timelines for choreographed multi-element animation
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
      // Cleared tiles shrink and fade with scale bounce
      const clearTargets = el.querySelectorAll('.blast-cascade-clear');
      if (clearTargets.length > 0) {
        anime({
          targets: clearTargets,
          scale: [1, 1.2, 0],
          opacity: [1, 0.8, 0],
          rotate: [0, anime.stagger([-15, 15])],
          duration: 280,
          easing: 'easeInBack',
          delay: anime.stagger(30, { from: 'center' }),
        });
      }
    }

    if (phase === 'falling') {
      // Falling tiles animate from old position to new position
      const fallTargets = el.querySelectorAll('.blast-cascade-fall');
      if (fallTargets.length > 0) {
        anime({
          targets: fallTargets,
          translateY: [
            // Start at negative offset (original position above final)
            function (el: Element) {
              const dist = Number((el as HTMLElement).dataset.fallDistance || 0);
              return -dist * cellSize;
            },
            0, // End at computed final position
          ],
          duration: 350,
          easing: 'easeOutBounce',
          delay: anime.stagger(40, { from: 'last' }),
        });
      }
    }

    if (phase === 'appearing') {
      // New tiles pop in from above
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
          scale: [0.3, 1],
          opacity: [0, 1],
          duration: 280,
          easing: 'easeOutElastic(1, 0.5)',
          delay: anime.stagger(50, { from: 'first' }),
        });
      }
    }
  }, [phase, data, cellSize]);

  if (!data || phase === 'idle') return null;

  const inset = 3;

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20">
      {/* Clearing phase: show tiles that are about to be removed */}
      {phase === 'clearing' && (
        <>
          {/* We render placeholders for cleared positions — the actual grid cells
              are already showing the cleared state. These are ghost tiles that
              animate the disappearance. */}
        </>
      )}

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
