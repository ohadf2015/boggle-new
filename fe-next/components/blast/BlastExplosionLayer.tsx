'use client';

import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup } from './types';

/** Varied colors per explosion type — avoids monotone orange */
const EXPLOSION_COLORS: Record<BlastExplosion['type'], string> = {
  bomb: '#FF4444',      // red
  clear: '#FFD700',     // gold
  word: '#00FFFF',      // cyan (was orange — now varied via palette in ExplosionEffect)
  cascade: '#FF00FF',   // magenta — distinct from player word clears
  lightning: '#FFFF00', // electric yellow
  magnet: '#8B00FF',    // purple
  prism: '#FF69B4',     // hot pink — spectrum detonation
  gem: '#50C878',       // emerald green — collection sparkle
};

/** Score popup intensity tier — scales visual impact with score value */
function getScoreIntensity(score: number): number {
  if (score >= 16) return 3;  // large: text-2xl + particle burst
  if (score >= 6) return 2;   // medium: text-xl + glow ring
  return 1;                   // small: text-lg plain
}

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

      {/* Score popups — scaled by score value for visual impact */}
      {scorePopups.map(popup => {
        const x = containerOffset.x + popup.col * cellSize + cellSize / 2;
        const y = containerOffset.y + popup.row * cellSize + cellSize / 2;
        const intensity = getScoreIntensity(popup.score);

        return (
          <div
            key={popup.id}
            style={{
              transform: intensity === 3 ? 'scale(1.35)' : intensity === 2 ? 'scale(1.15)' : 'scale(1)',
              filter: intensity >= 2 ? `drop-shadow(0 0 ${intensity === 3 ? '12' : '6'}px rgba(255,215,0,${intensity === 3 ? '0.6' : '0.35'}))` : 'none',
            }}
          >
            <ScorePopup
              score={popup.score}
              position={{ x, y }}
              onComplete={() => onScorePopupComplete(popup.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
