'use client';

import { useEffect, useRef } from 'react';
import { BLAST_ANIM, type BlastCascadePhase, type CascadeAnimationData } from './hooks/useBlastCascade';
import type { BlastTileType } from './types';

/** Clearing phase background color per tile type — gives visual feedback about what cleared */
const CLEARING_COLORS: Partial<Record<BlastTileType, { background: string; border: string }>> = {
  gold:      { background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '2px solid rgba(255,215,0,0.8)' },
  bomb:      { background: 'radial-gradient(circle, #FF4444 0%, #CC0000 100%)', border: '2px solid rgba(255,50,50,0.8)' },
  rainbow:   { background: 'linear-gradient(135deg, #FF69B4 0%, #A855F7 50%, #00BFFF 100%)', border: '2px solid rgba(168,85,247,0.8)' },
  ice:       { background: 'linear-gradient(135deg, #B4E6FF 0%, #82C8FF 100%)', border: '2px solid rgba(150,220,255,0.8)' },
  lightning: { background: 'linear-gradient(135deg, #FFE100 0%, #00BFFF 100%)', border: '2px solid rgba(255,225,0,0.8)' },
  prism:     { background: 'conic-gradient(from 0deg, #f00, #f90, #ff0, #0f0, #06f, #93f, #f00)', border: '2px solid rgba(255,255,255,0.8)' },
  gem:       { background: 'radial-gradient(circle, #50C878 0%, #009450 100%)', border: '2px solid rgba(80,200,120,0.8)' },
  frozen:    { background: 'linear-gradient(135deg, #C8DCFF 0%, #A0C8F0 100%)', border: '2px solid rgba(180,220,255,0.8)' },
  magnet:    { background: 'radial-gradient(circle, #8B00FF 0%, #FF0040 100%)', border: '2px solid rgba(139,0,255,0.8)' },
  mirror:    { background: 'radial-gradient(circle, #E0E0FF 0%, #8888FF 100%)', border: '2px solid rgba(136,136,255,0.8)' },
  silver:    { background: 'radial-gradient(circle, #E8E8E8 0%, #B0B0B0 100%)', border: '2px solid rgba(192,192,192,0.8)' },
  diamond:   { background: 'radial-gradient(circle, #B9F2FF 0%, #00CED1 100%)', border: '2px solid rgba(0,206,209,0.8)' },
};

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

  // Run anime.js animations when phase changes — dynamically imported to save ~6KB
  useEffect(() => {
    if (!overlayRef.current || !data || phase === 'idle') return;

    const el = overlayRef.current;

    import('animejs').then(({ default: anime }) => {
      if (!el.isConnected) return;

      if (phase === 'clearing') {
        const clearTargets = el.querySelectorAll('.blast-cascade-clear');
        if (clearTargets.length > 0) {
          anime({
            targets: clearTargets,
            scale: [1, 1.15, 0],
            opacity: [1, 0.9, 0],
            rotate: anime.stagger([-6, 6]),
            duration: BLAST_ANIM.clear.duration,
            easing: 'cubicBezier(0.55, 0, 1, 0.45)',
            delay: anime.stagger(BLAST_ANIM.clear.stagger, { from: 'center' }),
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
            scaleY: [0.92, 1.08, 0.98, 1.0],
            scaleX: [1.05, 0.94, 1.01, 1.0],
            duration: function (el: Element) {
              const dist = Number((el as HTMLElement).dataset.fallDistance || 1);
              return BLAST_ANIM.fall.baseDuration + dist * BLAST_ANIM.fall.perRowDuration;
            },
            easing: 'cubicBezier(0.34, 1.56, 0.64, 1)',
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
            scale: [0.6, 1],
            opacity: [0, 1],
            duration: BLAST_ANIM.appear.duration,
            easing: 'cubicBezier(0.22, 1, 0.36, 1)',
            delay: anime.stagger(BLAST_ANIM.appear.stagger, { from: 'first' }),
          });
        }
      }
    });
  }, [phase, data, cellSize]);

  if (!data || phase === 'idle') return null;

  const inset = 3;

  return (
    <div ref={overlayRef} className="absolute inset-0 pointer-events-none z-20">
      {/* Clearing phase: render ghost tiles at cleared positions that animate away */}
      {phase === 'clearing' && data.clearedTiles.map(tile => {
        const colorConfig = CLEARING_COLORS[tile.type];
        return (
          <div
            key={`clear-${tile.row}-${tile.col}`}
            className={`blast-cascade-clear absolute flex items-center justify-center rounded-lg font-black ${colorConfig ? 'text-white' : 'text-neo-black letter-tile-gradient'}`}
            style={{
              left: tile.col * cellSize + inset,
              top: tile.row * cellSize + inset,
              width: cellSize - inset * 2,
              height: cellSize - inset * 2,
              fontSize: cellSize * 0.45,
              willChange: 'transform, opacity',
              ...(colorConfig ? { background: colorConfig.background, border: colorConfig.border } : { border: '2px solid rgba(0,0,0,0.3)' }),
            }}
          >
            {tile.letter}
          </div>
        );
      })}

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
            willChange: 'transform',
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
            willChange: 'transform, opacity',
          }}
        >
          {tile.letter}
        </div>
      ))}
    </div>
  );
}
