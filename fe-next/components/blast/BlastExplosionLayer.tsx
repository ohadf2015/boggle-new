'use client';

import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup } from './types';

/** Varied colors per explosion type — avoids monotone orange */
const EXPLOSION_COLORS: Record<BlastExplosion['type'], string> = {
  bomb: '#FF4444',              // red
  clear: '#FFD700',             // gold
  word: '#00FFFF',              // cyan
  cascade: '#FF00FF',           // magenta — distinct from player word clears
  lightning: '#FFFF00',         // electric yellow
  magnet: '#8B00FF',            // purple
  prism: '#FF69B4',             // hot pink — spectrum detonation
  gem: '#50C878',               // emerald green — collection sparkle
  combo: '#FF6B35',             // orange — special tile combo
  mega_blast: '#FF1493',        // deep pink — mega blast combo
  total_destruction: '#FFE135', // bright yellow — total destruction
};

/** Score popup intensity tier — wider range for better feedback hierarchy.
 * Small words (3-letter, low score) should feel trivial; long words should feel exceptional. */
function getScoreIntensity(score: number): number {
  if (score >= 25) return 3;  // exceptional: large scale + particle burst (8+ letter words)
  if (score >= 10) return 2;  // strong: medium scale (5-7 letter words)
  return 1;                   // subtle: small, no extra effects (3-4 letter words)
}

/** Cap simultaneous explosions to prevent visual overload during bomb chains.
 * Excess explosions are dropped — the player won't notice missing particles
 * in a sea of 15 simultaneous detonations, but they WILL notice the jank. */
const MAX_VISIBLE_EXPLOSIONS = 6;

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
      {/* Particle explosions — capped to prevent GPU overload during bomb chains */}
      {explosions.slice(0, MAX_VISIBLE_EXPLOSIONS).map(exp => {
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
              transform: intensity === 3 ? 'scale(1.5)' : intensity === 2 ? 'scale(1.2)' : 'scale(0.9)',
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
