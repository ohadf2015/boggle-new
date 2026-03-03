'use client';

import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup, BlastTileType } from './types';

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

/** Drop-shadow color per tile type for score popups */
const POPUP_GLOW_COLORS: Partial<Record<BlastTileType, string>> = {
  gold: 'rgba(255,215,0,0.7)',
  bomb: 'rgba(255,50,50,0.6)',
  rainbow: 'rgba(168,85,247,0.6)',
  lightning: 'rgba(255,255,0,0.6)',
  prism: 'rgba(255,105,180,0.6)',
  gem: 'rgba(80,200,120,0.6)',
  magnet: 'rgba(139,0,255,0.6)',
  ice: 'rgba(150,220,255,0.5)',
  frozen: 'rgba(180,220,255,0.5)',
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
        const glowColor = popup.tileType ? POPUP_GLOW_COLORS[popup.tileType] : undefined;
        const defaultGlow = `rgba(255,215,0,${intensity === 3 ? '0.6' : '0.35'})`;

        return (
          <div
            key={popup.id}
            style={{
              transform: intensity === 3 ? 'scale(1.35)' : intensity === 2 ? 'scale(1.15)' : 'scale(1)',
              filter: intensity >= 2 || glowColor
                ? `drop-shadow(0 0 ${intensity === 3 ? '12' : '8'}px ${glowColor || defaultGlow})`
                : 'none',
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
