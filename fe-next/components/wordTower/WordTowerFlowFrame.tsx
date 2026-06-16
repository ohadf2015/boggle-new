'use client';

import { flowFrameLevel } from '@/lib/wordTower/flowFrame';

interface Props {
  /** Live steady-hands perfect-drop streak. */
  perfectStreak: number;
  reducedMotion?: boolean;
}

/**
 * Hard-edged "in the zone" frame: a solid inset border that lights the whole
 * play area once the perfect-drop streak gets hot, escalating to a gold "ON
 * FIRE" frame. On-brand neo-brutalist — a crisp inset edge (no blur/glow), with
 * a slow opacity pulse that holds static under reduced motion. Inert overlay.
 */
export function WordTowerFlowFrame({ perfectStreak, reducedMotion }: Props) {
  const frame = flowFrameLevel(perfectStreak);
  if (!frame) return null;

  // Thickness + opacity ramp with intensity; the fire tier reads thicker + louder.
  const thickness = Math.round((frame.fire ? 5 : 3) + frame.intensity * 4);
  const opacity = 0.45 + frame.intensity * 0.45;

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[7] ${reducedMotion ? '' : 'animate-pulse'}`}
      style={{
        // Inset hard border (no blur) + a second tighter line for a layered,
        // deliberate "framed" look rather than a single flat outline.
        boxShadow: `inset 0 0 0 ${thickness}px ${frame.color}, inset 0 0 0 ${thickness + 2}px rgba(0,0,0,0.85)`,
        opacity,
      }}
      role="presentation"
      aria-hidden
    />
  );
}
