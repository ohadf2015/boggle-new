'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { FireFlame } from '@9am/fire-flame-react';

interface FireBottomEffectProps {
  isActive: boolean;
}

/**
 * FireBottomEffect — Renders a pixelated canvas fire along the bottom
 * of the screen during fire rounds.
 *
 * Uses a React portal to render directly into document.body, escaping
 * ancestor stacking contexts (overflow-hidden, transform from Framer Motion)
 * that would otherwise clip or hide the fixed-position overlay.
 *
 * pointer-events-none so the fire overlay never blocks tile interaction.
 */
export const FireBottomEffect: React.FC<FireBottomEffectProps> = ({ isActive }) => {
  if (!isActive) return null;

  const content = (
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

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};
