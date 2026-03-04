'use client';

import React from 'react';
import { FireFlame } from '@9am/fire-flame-react';

interface FireBottomEffectProps {
  isActive: boolean;
}

/**
 * FireBottomEffect — Renders a pixelated canvas fire along the bottom
 * of the screen during fire rounds.
 *
 * Uses @9am/fire-flame-react for a retro, pixel-particle fire effect
 * that suits the neo-brutalist design language.
 *
 * pointer-events-none so the fire overlay never blocks tile interaction.
 */
export const FireBottomEffect: React.FC<FireBottomEffectProps> = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div
      data-testid="fire-bottom-effect"
      className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
      style={{ height: '120px' }}
    >
      <FireFlame
        option={{
          painter: 'canvas',
          w: typeof window !== 'undefined' ? window.innerWidth : 400,
          h: 120,
          fps: 30,
          mousemove: false,
        }}
      />
    </div>
  );
};
