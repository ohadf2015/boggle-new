/**
 * BossActiveBattleUI Component
 *
 * Extracted from BossOverlay — renders the active battle UI during boss fights.
 * Includes boss avatar with reaction animations, HP bar, dialogue, telegraph,
 * and attack effect overlays.
 */

'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords } from 'lucide-react';
import SegmentedHPBar from './SegmentedHPBar';
import { AttackTelegraph } from './AttackTelegraph';
import BossDialogue from '../BossDialogue';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BossConfig } from '@/types/boss';

// ==============================================
// TYPES
// ==============================================

interface TelegraphState {
  progress: number;
  targetTiles: number[];
  abilityId: string | null;
  timeRemaining: number;
}

interface AttackEffectState {
  abilityName: string | null;
  damage: number;
}

export interface BossActiveBattleUIProps {
  /** Boss configuration */
  boss: BossConfig;
  /** Current HP */
  currentHP: number;
  /** Maximum HP */
  maxHP: number;
  /** Current derived phase */
  phase: 'phase1' | 'phase2' | 'enraged';
  /** Boss avatar reaction state */
  bossReaction: 'idle' | 'attacking' | 'hit';
  /** Whether to show taunt dialogue */
  showTaunt: boolean;
  /** Current taunt translation key */
  currentTaunt: string | null;
  /** Whether attack telegraph is active */
  isTelegraphing: boolean;
  /** Telegraph display state */
  telegraphState: TelegraphState;
  /** Currently telegraphing ability (for name display) */
  telegraphingAbility: { name: string } | null;
  /** Active attack effect overlay */
  attackEffect: AttackEffectState | null;
}

// ==============================================
// COMPONENT
// ==============================================

const BossActiveBattleUI = memo<BossActiveBattleUIProps>(({
  boss,
  currentHP,
  maxHP,
  phase,
  bossReaction,
  showTaunt,
  currentTaunt,
  isTelegraphing,
  telegraphState,
  telegraphingAbility,
  attackEffect,
}) => {
  const { t } = useLanguage();
  const bossFightTheme = useBossFightTheme();

  return (
    <>
      {/* Boss HP Bar + Avatar Row */}
      <div className="fixed top-12 sm:top-14 left-0 right-0 z-30 pointer-events-none">
        <div className="w-full max-w-2xl mx-auto px-4 pt-3">
          <div className="flex items-center gap-3 mb-2">
            {/* Boss Avatar */}
            <motion.div
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-neo border-3 border-neo-black shadow-hard-sm overflow-hidden bg-neo-navy-light flex-shrink-0"
              animate={
                bossReaction === 'attacking'
                  ? { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }
                  : bossReaction === 'hit'
                    ? { x: [0, -3, 3, -2, 2, 0], scale: [1, 0.95, 1] }
                    : { scale: 1, rotate: 0, x: 0 }
              }
              transition={{ duration: 0.3 }}
              data-testid="boss-avatar"
            >
              {boss.imagePath ? (
                <Image
                  src={boss.imagePath}
                  alt={t(boss.displayName)}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  <Swords className="w-6 h-6 text-neo-yellow" />
                </div>
              )}

              {/* Enraged glow */}
              {phase === 'enraged' && (
                <motion.div
                  className="absolute inset-0 border-2 border-neo-red rounded-neo"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  data-testid="boss-avatar-enraged-glow"
                />
              )}
            </motion.div>

            {/* HP Bar */}
            <div className="flex-1 min-w-0">
              <SegmentedHPBar
                currentHP={currentHP}
                maxHP={maxHP}
                phase={phase}
                bossName={boss.displayName}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Boss Dialogue/Taunts */}
      {showTaunt && currentTaunt && (
        <BossDialogue
          boss={boss}
          currentTaunt={currentTaunt}
          isVisible={showTaunt}
          position="top"
        />
      )}

      {/* Attack Telegraph */}
      <AttackTelegraph
        isActive={isTelegraphing}
        progress={telegraphState.progress}
        targetTiles={telegraphState.targetTiles}
        abilityId={telegraphState.abilityId}
        timeRemaining={telegraphState.timeRemaining}
        abilityName={telegraphingAbility?.name}
      />

      {/* Boss Attack Effect */}
      <AnimatePresence>
        {attackEffect && (
          <motion.div
            className="fixed inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            data-testid="boss-attack-effect"
          >
            {/* Red damage flash */}
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 0.5 }}
              style={{ backgroundColor: 'rgba(255, 0, 0, 0.3)' }}
            />

            {/* Slash marks */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [0, 1.5, 1.2], rotate: [-45, -45, -45] }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="relative w-32 h-32">
                <motion.div
                  className="absolute top-1/2 left-0 w-full h-1 bg-neo-red rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 1, 0.8] }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                  style={{ boxShadow: '0 0 12px rgba(255, 51, 102, 0.8)' }}
                />
                <motion.div
                  className="absolute top-1/2 left-0 w-full h-1 bg-neo-red rounded-full rotate-45"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 1, 0.8] }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                  style={{ boxShadow: '0 0 12px rgba(255, 51, 102, 0.8)' }}
                />
              </div>
            </motion.div>

            {/* Damage number */}
            {attackEffect.damage > 0 && (
              <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2"
                initial={{ y: 0, opacity: 0, scale: 0.5 }}
                animate={{ y: -40, opacity: [0, 1, 1, 0], scale: [0.5, 1.3, 1] }}
                transition={{ duration: 0.7 }}
              >
                <span className="font-neo-display text-3xl font-bold text-neo-red drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  -{attackEffect.damage}
                </span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

BossActiveBattleUI.displayName = 'BossActiveBattleUI';

export default BossActiveBattleUI;
