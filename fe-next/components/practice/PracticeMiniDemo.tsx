'use client';

import React from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

/**
 * 1.5s loop showing the core mechanic per mode. CSS-only animation, no GIF assets.
 *  - classic / wordHunt: a 2×2 mini-grid with an animated drag path
 *  - wheelRush: 4 outer letters rotating around a center letter
 *
 * Designed as a bridge between intro and tutorial — wordless mechanic preview.
 */
interface Props {
  mode: PracticeMode;
}

const COLOR_FOR_MODE: Record<PracticeMode, { tile: string; path: string; ring: string }> = {
  classic: {
    tile: 'bg-neo-cyan/30 border-neo-cyan text-neo-cream',
    path: 'bg-neo-cyan',
    ring: 'border-neo-cyan/60',
  },
  wordHunt: {
    tile: 'bg-neo-lime/30 border-neo-lime text-neo-cream',
    path: 'bg-neo-lime',
    ring: 'border-neo-lime/60',
  },
  wheelRush: {
    tile: 'bg-neo-purple/30 border-neo-purple text-neo-cream',
    path: 'bg-neo-purple',
    ring: 'border-neo-purple/60',
  },
};

export default function PracticeMiniDemo({ mode }: Props) {
  const c = COLOR_FOR_MODE[mode];

  if (mode === 'wheelRush') {
    // Center + 4 satellite letters; satellites pulse in sequence
    return (
      <div className="relative w-32 h-32 mx-auto" aria-hidden>
        <span className={`absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}>
          E
        </span>
        {(['C', 'A', 'R', 'T'] as const).map((letter, idx) => {
          const angle = idx * 90;
          return (
            <AdaptiveMotion.span
              key={letter}
              className={`absolute top-1/2 left-1/2 w-9 h-9 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-base shadow-hard-sm`}
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-52px) rotate(${-angle}deg)`,
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.4, ease: 'easeInOut' }}
            >
              {letter}
            </AdaptiveMotion.span>
          );
        })}
      </div>
    );
  }

  // classic / wordHunt: 2×2 grid with drag-trail bar that slides through
  const tiles: Array<[string, [number, number]]> = [
    ['C', [0, 0]],
    ['A', [1, 0]],
    ['T', [1, 1]],
    ['S', [0, 1]],
  ];
  return (
    <div className="relative w-32 h-32 mx-auto" aria-hidden>
      {tiles.map(([letter, [x, y]], idx) => (
        <AdaptiveMotion.span
          key={letter}
          className={`absolute w-12 h-12 rounded-neo border-2 ${c.tile} flex items-center justify-center font-neo-display font-black text-xl shadow-hard-sm`}
          style={{ left: `${x * 64 + 4}px`, top: `${y * 64 + 4}px` }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, delay: idx * 0.35, ease: 'easeInOut' }}
        >
          {letter}
        </AdaptiveMotion.span>
      ))}
      {/* Trail dot following the path C→A→T */}
      <AdaptiveMotion.span
        className={`absolute w-3 h-3 rounded-full ${c.path} shadow-hard-sm`}
        animate={{
          left: ['28px', '92px', '92px', '28px', '28px'],
          top: ['28px', '28px', '92px', '92px', '28px'],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
