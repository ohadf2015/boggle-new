'use client';

import { useMemo } from 'react';
import { BlastScoreFly, type ScoreFlyEvent } from './BlastScoreFly';
import { BlastComboFlash } from './BlastComboFlash';
import { CHAIN_GLOW_COLORS } from './blastColorTokens';

interface BlastEffectsLayerProps {
  scoreFlyEvents: ScoreFlyEvent[];
  onScoreFlyComplete: (id: string) => void;
  comboFlash: { id: string; tier: 1 | 2 | 3 } | null;
  onComboFlashComplete: () => void;
  comboTypeName?: string;
  intensity: number;
}

function getGlowStyle(intensity: number): React.CSSProperties | undefined {
  if (intensity <= 0) return undefined;
  const spread = intensity * 6;
  // Use CHAIN_GLOW_COLORS tokens — clamp to available levels
  const level = Math.min(intensity, 3);
  const baseColor = CHAIN_GLOW_COLORS[level] ?? CHAIN_GLOW_COLORS[3];
  if (baseColor === 'none') return undefined;
  const alpha = Math.min(0.15 + intensity * 0.1, 0.6);
  return {
    boxShadow: `0 0 ${spread}px ${baseColor}${Math.round(alpha * 255).toString(16).padStart(2, '0')}, inset 0 0 ${spread / 2}px ${baseColor}${Math.round(alpha * 0.5 * 255).toString(16).padStart(2, '0')}`,
    transition: 'box-shadow 0.3s ease',
  };
}

export function BlastEffectsLayer({
  scoreFlyEvents,
  onScoreFlyComplete,
  comboFlash,
  onComboFlashComplete,
  comboTypeName,
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
      <BlastComboFlash flash={comboFlash} onComplete={onComboFlashComplete} comboTypeName={comboTypeName} />
      <BlastScoreFly flies={scoreFlyEvents} onComplete={onScoreFlyComplete} />
    </div>
  );
}

export type { ScoreFlyEvent } from './BlastScoreFly';
