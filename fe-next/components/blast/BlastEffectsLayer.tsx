'use client';

import { useMemo } from 'react';
import { BlastScoreFly, type ScoreFlyEvent } from './BlastScoreFly';
import { BlastComboFlash } from './BlastComboFlash';
import { BlastPopBurst, type PopBurstEvent } from './BlastPopBurst';
import { CHAIN_GLOW_COLORS } from './blastColorTokens';

const POP_BURST_TIER_COLORS: Record<2 | 3, string> = {
  2: '#00FFFF',
  3: '#BFFF00',
};

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
  const popBursts: PopBurstEvent[] = useMemo(
    () =>
      scoreFlyEvents
        .filter(e => e.tier >= 2)
        .map(e => ({
          id: `pop-${e.id}`,
          startX: e.startX,
          startY: e.startY,
          color: POP_BURST_TIER_COLORS[e.tier as 2 | 3] ?? POP_BURST_TIER_COLORS[2],
        })),
    [scoreFlyEvents],
  );

  return (
    <div
      data-testid="blast-effects-layer"
      className={`absolute inset-0 pointer-events-none z-40 rounded-neo ${pulseClass}`}
      style={glowStyle}
    >
      <BlastComboFlash flash={comboFlash} onComplete={onComboFlashComplete} comboTypeName={comboTypeName} />
      <BlastPopBurst bursts={popBursts} onComplete={() => {}} />
      <BlastScoreFly flies={scoreFlyEvents} onComplete={onScoreFlyComplete} />
    </div>
  );
}

export type { ScoreFlyEvent } from './BlastScoreFly';
