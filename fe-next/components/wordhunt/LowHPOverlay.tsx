'use client';

import { cn } from '@/lib/utils';

interface LowHPOverlayProps {
  hp: number;
}

/**
 * Red vignette overlay when player HP is critically low.
 * - HP < 20: slow pulse (1s)
 * - HP < 10: fast pulse (0.5s) + shake
 * Respects prefers-reduced-motion via CSS.
 */
export function LowHPOverlay({ hp }: LowHPOverlayProps) {
  if (hp >= 20) return null;

  const isCritical = hp < 10;
  const animationDuration = isCritical ? '0.5s' : '1s';

  return (
    <div
      data-testid="low-hp-overlay"
      className={cn(
        'fixed inset-0 z-50 animate-low-hp-pulse motion-reduce:animate-none',
        isCritical && 'animate-neo-shake motion-reduce:animate-none'
      )}
      style={{
        pointerEvents: 'none',
        animationDuration,
        background:
          'radial-gradient(ellipse at center, transparent 50%, rgba(255,0,0,0.3) 100%)',
      }}
    />
  );
}
