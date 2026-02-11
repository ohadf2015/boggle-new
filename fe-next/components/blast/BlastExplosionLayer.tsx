'use client';

import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup } from './types';

/** Varied colors per explosion type — avoids monotone orange */
const EXPLOSION_COLORS: Record<BlastExplosion['type'], string> = {
  bomb: '#FF4444',   // red
  clear: '#FFD700',  // gold
  word: '#00FFFF',   // cyan (was orange — now varied via palette in ExplosionEffect)
};

interface BlastExplosionLayerProps {
  explosions: BlastExplosion[];
  scorePopups: BlastScorePopup[];
  onExplosionComplete: (id: string) => void;
  onScorePopupComplete: (id: string) => void;
  /** Cell size for converting grid coords to pixel positions */
  cellSize: number;
  /** Container offset for positioning */
  containerOffset: { x: number; y: number };
}

/**
 * BlastExplosionLayer - Renders particle explosions and score popups
 * Reuses ExplosionEffect and ScorePopup from adventure mode.
 * Positioned absolutely over the grid.
 */
export function BlastExplosionLayer({
  explosions,
  scorePopups,
  onExplosionComplete,
  onScorePopupComplete,
  cellSize,
  containerOffset,
}: BlastExplosionLayerProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Particle explosions */}
      {explosions.map(exp => {
        const x = containerOffset.x + exp.col * cellSize + cellSize / 2;
        const y = containerOffset.y + exp.row * cellSize + cellSize / 2;

        return (
          <ExplosionEffect
            key={exp.id}
            position={{ x, y }}
            intensity={exp.intensity}
            color={EXPLOSION_COLORS[exp.type]}
            onComplete={() => onExplosionComplete(exp.id)}
          />
        );
      })}

      {/* Score popups — convert grid coords to pixel positions */}
      {scorePopups.map(popup => {
        const x = containerOffset.x + popup.col * cellSize + cellSize / 2;
        const y = containerOffset.y + popup.row * cellSize + cellSize / 2;

        return (
          <ScorePopup
            key={popup.id}
            score={popup.score}
            position={{ x, y }}
            onComplete={() => onScorePopupComplete(popup.id)}
          />
        );
      })}
    </div>
  );
}
