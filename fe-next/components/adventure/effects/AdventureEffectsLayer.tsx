/**
 * AdventureEffectsLayer Component
 *
 * Manages all visual effects for adventure mode:
 * - Score popups
 * - Particle effects (combos, chains)
 * - Explosions
 * - Lexi reactions
 * - Level-up celebrations
 * - Combo milestones
 * - Boss defeat fireworks
 *
 * Extracted from AdventureGame.tsx to improve maintainability and reduce file size.
 */

'use client';

import React, { memo } from 'react';
import { ScorePopup } from '../juice/ScorePopup';
import { ChainParticleBurst } from '@/components/animations/ChainParticleBurst';
import { AdaptiveParticles } from '../juice/AdaptiveParticles';
import { ExplosionEffect } from '../juice/ExplosionEffect';
import { LevelUpCelebration, type LevelUpPayload } from '@/components/education/LevelUpCelebration';
import LexiReaction from '../LexiReaction';
import { ComboMilestoneOverlay } from '../ComboMilestoneOverlay';
import { BossDefeatFireworks, type BossTier } from '@/components/celebration/BossDefeatFireworks';
import type { ComboMilestoneConfig } from '@/hooks/useComboMilestone';
import type { LexiReaction as LexiReactionData } from '@/hooks/useLexiReactions';

// ==============================================
// TYPES
// ==============================================

export interface ScorePopupData {
  id: number;
  value: number;
  x: number;
  y: number;
  word?: string;
  bonus?: string;
}

export interface PendingExplosion {
  id: number;
  position: { x: number; y: number };
  intensity: 1 | 2 | 3 | 4;
}

export interface ChainBurstConfig {
  trigger: boolean;
  position: { x: number; y: number };
}

export interface ParticleConfig {
  intensity: 1 | 2 | 3 | 4 | 5;
  origin: { x: number; y: number };
}

export interface AdventureEffectsLayerProps {
  /** Current score popup to display */
  currentPopup: ScorePopupData | null;
  /** Callback when score popup animation completes */
  onPopupComplete: () => void;
  /** Reference to score display element for popup animation target */
  scoreDisplayRef: React.RefObject<HTMLDivElement | null>;

  /** Lexi reaction state */
  reaction: LexiReactionData | null;
  /** Callback to dismiss Lexi reaction */
  onDismissReaction: () => void;

  /** Chain particle burst configuration */
  chainBurstConfig: ChainBurstConfig | null;
  /** Callback when chain burst completes */
  onChainBurstComplete: () => void;
  /** Current world number (for themed particles) */
  world: number;

  /** Adaptive particle configuration */
  particleConfig: ParticleConfig | null;
  /** Callback when adaptive particles complete */
  onParticleComplete: () => void;

  /** Pending explosion effects */
  pendingExplosions: PendingExplosion[];
  /** Callback when explosion completes */
  onExplosionComplete: (explosionId: number) => void;

  /** Level-up celebration data */
  levelUpData: LevelUpPayload | null;
  /** Callback when level-up celebration closes */
  onLevelUpClose: () => void;

  /** Current combo milestone */
  currentMilestone: ComboMilestoneConfig | null;

  /** Boss-related effects */
  isBossLevel: boolean;
  showBossFireworks: boolean;
  defeatedBossTier: BossTier | null;
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * AdventureEffectsLayer renders all visual effects for adventure mode.
 *
 * This component is purely presentational and receives all state via props,
 * making it easy to test and reuse. It handles:
 * - Score popup animations
 * - Particle systems (chains, combos)
 * - Explosion effects
 * - Character reactions
 * - Celebration overlays
 */
const AdventureEffectsLayer = memo<AdventureEffectsLayerProps>(({
  currentPopup,
  onPopupComplete,
  scoreDisplayRef,
  reaction,
  onDismissReaction,
  chainBurstConfig,
  onChainBurstComplete,
  world,
  particleConfig,
  onParticleComplete,
  pendingExplosions,
  onExplosionComplete,
  levelUpData,
  onLevelUpClose,
  currentMilestone,
  isBossLevel,
  showBossFireworks,
  defeatedBossTier,
}) => {
  return (
    <>
      {/* Score Popup Animation */}
      {currentPopup && (
        <ScorePopup
          score={currentPopup.value}
          position={{ x: currentPopup.x, y: currentPopup.y }}
          targetPosition={scoreDisplayRef.current ? {
            x: scoreDisplayRef.current.getBoundingClientRect().left + scoreDisplayRef.current.getBoundingClientRect().width / 2,
            y: scoreDisplayRef.current.getBoundingClientRect().top + scoreDisplayRef.current.getBoundingClientRect().height / 2,
          } : undefined}
          comboMultiplier={currentPopup.bonus ? parseFloat(currentPopup.bonus.replace('x', '')) : undefined}
          onComplete={onPopupComplete}
        />
      )}

      {/* Lexi Mascot Reactions */}
      <LexiReaction
        reaction={reaction}
        onDismiss={onDismissReaction}
      />

      {/* Chain Particle Burst */}
      {chainBurstConfig && (
        <ChainParticleBurst
          trigger={chainBurstConfig.trigger}
          position={chainBurstConfig.position}
          world={world}
          onComplete={onChainBurstComplete}
        />
      )}

      {/* Adaptive Particles for combo tier changes */}
      {particleConfig && (
        <AdaptiveParticles
          type="combo"
          intensity={particleConfig.intensity}
          origin={particleConfig.origin}
          onComplete={onParticleComplete}
        />
      )}

      {/* Explosion Effects */}
      {pendingExplosions.map((explosion) => (
        <ExplosionEffect
          key={explosion.id}
          position={explosion.position}
          intensity={explosion.intensity}
          onComplete={() => onExplosionComplete(explosion.id)}
        />
      ))}

      {/* Level-Up Celebration Modal */}
      <LevelUpCelebration
        levelUpData={levelUpData}
        onClose={onLevelUpClose}
      />

      {/* Combo Milestone Overlay */}
      <ComboMilestoneOverlay milestone={currentMilestone} />

      {/* Boss Defeat Fireworks */}
      {isBossLevel && defeatedBossTier && (
        <BossDefeatFireworks
          active={showBossFireworks}
          bossTier={defeatedBossTier}
        />
      )}
    </>
  );
});

AdventureEffectsLayer.displayName = 'AdventureEffectsLayer';

export default AdventureEffectsLayer;
