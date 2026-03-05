'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FireFlame, type FireFlameOption } from '@9am/fire-flame-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const FLAME_HEIGHT = 160;

/** Number of individual flame sources spread across the screen width. */
const FLAME_COUNT = 3;

interface FireBottomEffectProps {
  isActive: boolean;
}

/**
 * FireBottomEffect — Renders canvas fire flames along the bottom
 * of the screen during fire rounds.
 *
 * Uses a React portal to render directly into document.body, escaping
 * ancestor stacking contexts (overflow-hidden, transform from Framer Motion)
 * that would otherwise clip or hide the fixed-position overlay.
 *
 * pointer-events-none so the fire overlay never blocks tile interaction.
 */
export const FireBottomEffect: React.FC<FireBottomEffectProps> = ({ isActive }) => {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 400
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isActive || prefersReducedMotion) return null;

  // Spread multiple flame sources evenly across the width
  const flameWidth = Math.ceil(width / FLAME_COUNT);
  const flames = Array.from({ length: FLAME_COUNT }, (_, i) => ({
    key: i,
    x: flameWidth / 2,
    w: flameWidth,
  }));

  const content = (
    <div
      ref={containerRef}
      data-testid="fire-bottom-effect"
      className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none"
      style={{ height: `${FLAME_HEIGHT}px`, display: 'flex' }}
    >
      {flames.map((flame) => (
        <FireFlame
          key={flame.key}
          option={{
            w: flame.w,
            h: FLAME_HEIGHT,
            x: flame.x,
            y: FLAME_HEIGHT - 10,
            fps: 30,
            mousemove: false,
            particleNum: 20,
            particleDistance: 8,
            innerColor: '#FFE135',
            outerColor: '#FF4500',
          } as FireFlameOption}
        />
      ))}
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
};
