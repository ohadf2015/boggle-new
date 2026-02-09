'use client';

import React from 'react';
import { ExplosionEffect } from '@/components/adventure/juice/ExplosionEffect';
import { ScorePopup } from '@/components/adventure/juice/ScorePopup';
import type { BlastExplosion, BlastScorePopup } from './types';

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
            color={exp.type === 'bomb' ? '#FF4444' : exp.type === 'clear' ? '#FFD700' : '#FF6B35'}
            onComplete={() => onExplosionComplete(exp.id)}
          />
        );
      })}

      {/* Score popups */}
      {scorePopups.map(popup => (
        <ScorePopup
          key={popup.id}
          score={popup.score}
          position={popup.position}
          onComplete={() => onScorePopupComplete(popup.id)}
        />
      ))}
    </div>
  );
}
