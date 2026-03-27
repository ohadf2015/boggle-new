'use client';

import { useMemo } from 'react';
import { BlastScoreFly, type ScoreFlyEvent } from './BlastScoreFly';
import { BlastComboFlash } from './BlastComboFlash';

interface BlastEffectsLayerProps {
  scoreFlyEvents: ScoreFlyEvent[];
  onScoreFlyComplete: (id: string) => void;
  comboFlash: { id: string; tier: 1 | 2 | 3 } | null;
  onComboFlashComplete: () => void;
  intensity: number;
}

function getGlowStyle(intensity: number): React.CSSProperties | undefined {
  if (intensity <= 0) return undefined;
  const spread = intensity * 6;
  let color: string;
  if (intensity <= 2) {
    color = `rgba(0, 255, 255, ${0.15 + intensity * 0.1})`;
  } else if (intensity <= 4) {
    color = `rgba(255, 230, 0, ${0.2 + (intensity - 2) * 0.1})`;
  } else {
    color = `rgba(255, 20, 147, 0.5)`;
  }
  return {
    boxShadow: `0 0 ${spread}px ${color}, inset 0 0 ${spread / 2}px ${color}`,
    transition: 'box-shadow 0.3s ease',
  };
}

export function BlastEffectsLayer({
  scoreFlyEvents,
  onScoreFlyComplete,
  comboFlash,
  onComboFlashComplete,
  intensity,
}: BlastEffectsLayerProps) {
  const glowStyle = useMemo(() => getGlowStyle(intensity), [intensity]);
  const pulseClass = intensity >= 5 ? 'animate-pulse' : '';

  return (
    <div
      data-testid="blast-effects-layer"
      className={`absolute inset-0 pointer-events-none z-30 rounded-neo ${pulseClass}`}
      style={glowStyle}
    >
      <BlastComboFlash flash={comboFlash} onComplete={onComboFlashComplete} />
      <BlastScoreFly flies={scoreFlyEvents} onComplete={onScoreFlyComplete} />
    </div>
  );
}

export type { ScoreFlyEvent } from './BlastScoreFly';
