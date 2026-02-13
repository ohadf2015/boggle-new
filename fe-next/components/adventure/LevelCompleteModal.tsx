/**
 * LevelCompleteModal Component
 *
 * Displays level completion results with stars, score, and objectives summary.
 * Shows celebration effects for perfect scores (3 stars).
 */

'use client';

import React, { memo, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, X, Trophy, RotateCcw, LogOut, Coins, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { InteractiveMascot, type ExtendedMascotVariant } from '@/components/ui/InteractiveMascot';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { RollingNumber } from './ui/RollingNumber';
import type { LevelObjective, LevelAttempt } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface LevelCompleteModalProps {
  /** Whether modal is visible */
  isOpen: boolean;
  /** Number of stars earned (0-3) */
  stars: number;
  /** Final score */
  score: number;
  /** Completed objectives */
  objectives: LevelObjective[];
  /** Current level number */
  levelNumber: number;
  /** Current world number */
  worldNumber: number;
  /** Whether this is a new high score */
  isHighScore?: boolean;
  /** Continue to next level callback */
  onContinue: () => void;
  /** Retry level callback */
  onRetry: () => void;
  /** Exit to menu callback */
  onExit: () => void;
  /** Total stars accumulated across all levels */
  totalStars?: number;
  /** Best attempt data for this level (shows partial progress on failure) */
  bestAttempt?: LevelAttempt | null;
}

/**
 * Get mascot variant based on star count
 * 3 stars = victory (trophy pose)
 * 2 stars = celebrating (celebration dance)
 * 1 star = happy (happy face)
 * 0 stars = thinking (thoughtful)
 */
function getMascotVariantForStars(stars: number): ExtendedMascotVariant {
  if (stars >= 3) return 'victory';      // Perfect! Trophy pose
  if (stars >= 2) return 'celebrating';  // Great! Celebration dance
  if (stars >= 1) return 'happy';        // Nice! Happy face
  return 'encouraging';                    // No stars? Supportive
}

/**
 * Get a subtle background tint based on stars earned.
 * Uses solid colors with low opacity - no gradients.
 */
function getBackgroundTint(stars: number): string {
  if (stars >= 3) {
    return 'rgba(255,225,53,0.05)';
  }
  if (stars >= 2) {
    return 'rgba(163,230,53,0.04)';
  }
  if (stars >= 1) {
    return 'rgba(34,211,238,0.03)';
  }
  return 'transparent';
}

// ==============================================
// COMPONENT
// ==============================================

const LevelCompleteModal = memo<LevelCompleteModalProps>(
  ({
    isOpen,
    stars,
    score,
    objectives,
    levelNumber,
    worldNumber,
    isHighScore = false,
    onContinue,
    onRetry,
    onExit,
    totalStars = 0,
    bestAttempt,
  }) => {
    const { t } = useLanguage();
    const isPerfect = stars === 3;
    const isFailed = stars === 0;
    const prefersReducedMotion = usePrefersReducedMotion();
    const particleBudget = useParticleBudget();

    // Count completed objectives
    const completedCount = useMemo(
      () => objectives.filter((o) => o.isComplete).length,
      [objectives]
    );

    // Fire victory confetti on mount (only for victory, not defeat)
    useEffect(() => {
      if (isOpen && !isFailed && !prefersReducedMotion) {
        // Respect particle budget tier
        if (particleBudget.combo > 0) {
          fireVictoryConfetti();
        }
      }
    }, [isOpen, isFailed, prefersReducedMotion, particleBudget.combo]);

    if (!isOpen) return null;

    return (
      <AnimatePresence>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="level-complete-title"
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center',
            'bg-neo-black/80 backdrop-blur-sm'
          )}
        >
          {/* Subtle background tint - no animated gradients */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: getBackgroundTint(stars) }}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className={cn(
              'relative w-full max-w-md mx-4',
              'bg-neo-navy border-4 border-neo-black',
              'rounded-neo shadow-hard-lg',
              'p-6 md:p-8'
            )}
          >
            {/* Enhanced Title */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="mb-2"
            >
              <h2
                id="level-complete-title"
                className={cn(
                  'text-center text-3xl md:text-4xl font-black uppercase tracking-tight',
                  isFailed ? 'text-neo-red' : isPerfect ? 'text-neo-yellow' : 'text-neo-white'
                )}
              >
                {isFailed ? t('adventure.game.tryAgain') : isPerfect 
                  ? t('adventure.perfect') || 'PERFECT!' 
                  : t('adventure.levelComplete')}
              </h2>
            </motion.div>

            {/* Level Number with badge */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neo-black/50 border-2 border-neo-white/20 rounded-neo">
                <span className="text-neo-white/60 text-sm font-bold uppercase">
                  {t('adventure.world')} {worldNumber}
                </span>
                <span className="text-neo-white/30">|</span>
                <span className="text-neo-white/80 text-sm font-bold">
                  {t('adventure.level')} {levelNumber}
                </span>
              </div>
            </motion.div>

            {/* Lexi Celebration - celebrates alongside existing star animation */}
            <motion.div
              className="flex justify-center mb-4"
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
                damping: 20,
              }}
            >
              <InteractiveMascot
                variant={getMascotVariantForStars(stars)}
                size="lg"
                animated
                enableHover={false}
                enableClick={false}
              />
            </motion.div>

            {/* Perfect Badge */}
            {isPerfect && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-lg font-black text-neo-yellow mb-4"
              >
                {t('adventure.game.perfect')}
              </motion.p>
            )}

            {/* Stars - clean animation without sparkle effects */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: i < stars ? 1 : 0.7,
                    opacity: i < stars ? 1 : 0.3,
                  }}
                  transition={{
                    delay: 0.3 + i * 0.1,
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  <Star
                    className={cn(
                      'w-12 h-12 md:w-14 md:h-14',
                      i < stars
                        ? 'text-neo-yellow fill-neo-yellow'
                        : 'text-neo-white/30 fill-transparent'
                    )}
                  />
                </motion.div>
              ))}
            </div>

            {/* Score & Rewards Grid */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              {/* Score */}
              <div className="bg-neo-black/60 backdrop-blur-sm border-3 border-neo-white/20 rounded-neo p-3">
                <div className="text-neo-white/60 text-xs font-bold mb-1 uppercase">{t('common.score')}</div>
                <RollingNumber 
                  value={score} 
                  variant="white"
                  className="text-xl md:text-2xl"
                />
              </div>

              {/* XP */}
              <div className="bg-neo-purple/20 backdrop-blur-sm border-3 border-neo-purple rounded-neo p-3">
                <div className="text-neo-purple text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
                  <Zap className="w-3 h-3" />
                  +XP
                </div>
                <RollingNumber 
                  value={Math.floor(score / 100)} 
                  variant="default"
                  className="text-xl md:text-2xl text-neo-purple"
                />
              </div>

              {/* Gold (only show if stars > 0) */}
              <div className={cn(
                'bg-neo-yellow/20 backdrop-blur-sm border-3 border-neo-yellow rounded-neo p-3',
                stars === 0 && 'opacity-50'
              )}>
                <div className="text-neo-yellow text-xs font-bold mb-1 flex items-center gap-1 justify-center uppercase">
                  <Coins className="w-3 h-3" />
                  Gold
                </div>
                <RollingNumber 
                  value={stars > 0 ? stars * 10 + (stars === 3 ? 50 : 0) : 0} 
                  variant="gold"
                  className="text-xl md:text-2xl"
                />
              </div>
            </motion.div>

            {/* High Score Badge */}
            {isHighScore && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="flex justify-center mb-4"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neo-lime/20 border-2 border-neo-lime rounded-neo">
                  <Trophy className="w-5 h-5 text-neo-lime" />
                  <span className="text-neo-lime font-bold">{t('adventure.game.newHighScore')}</span>
                </div>
              </motion.div>
            )}

            {/* Objectives Summary */}
            <div className="mb-6">
              <p className="text-neo-white/60 text-sm font-bold mb-2">
                {t('adventure.game.objectives')}: {completedCount}/{objectives.length}
              </p>
              <ul className="space-y-2">
                {objectives.map((objective) => (
                  <li
                    key={objective.type}
                    data-testid={
                      objective.isComplete
                        ? 'objective-complete'
                        : 'objective-incomplete'
                    }
                    className={cn(
                      'flex items-center gap-2 text-sm font-bold',
                      objective.isComplete
                        ? 'text-neo-lime'
                        : 'text-neo-white/50'
                    )}
                  >
                    {objective.isComplete ? (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{t(OBJECTIVE_TRANSLATION_KEYS[objective.type])}</span>
                    <span className="ml-auto font-mono">
                      {objective.current}/{objective.target}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Partial Progress Display (for failed attempts) */}
            {isFailed && bestAttempt && bestAttempt.attemptCount > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  'mb-6 p-4 rounded-neo',
                  'bg-neo-cyan/10 border-2 border-neo-cyan/30'
                )}
              >
                <p className="text-neo-cyan font-bold text-sm uppercase tracking-wide mb-2">
                  {t('adventure.game.yourBest')}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-neo-white/60">{t('adventure.game.words')}: </span>
                    <span className="font-bold text-neo-white">{bestAttempt.bestWords}</span>
                  </div>
                  <div>
                    <span className="text-neo-white/60">{t('common.score')}: </span>
                    <span className="font-bold text-neo-white">{bestAttempt.bestScore.toLocaleString()}</span>
                  </div>
                </div>
                {bestAttempt.attemptCount >= 3 && (
                  <p className="text-neo-lime text-sm font-bold mt-2">
                    {t('adventure.game.keepTrying')}
                  </p>
                )}
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {/* Continue Button (hidden when failed) */}
              {!isFailed && (
                <button
                  onClick={onContinue}
                  className={cn(
                    'btn-primary',
                    'w-full py-3 px-4',
                    'bg-neo-lime text-neo-black',
                    'font-black text-lg',
                    'border-3 border-neo-black rounded-neo',
                    'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                    'active:translate-y-0.5 active:shadow-hard-pressed',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                    'transition-all duration-200'
                  )}
                >
                  {t('adventure.continueToNext')}
                </button>
              )}

              {/* Retry Button */}
              <button
                onClick={onRetry}
                className={cn(
                  isFailed ? 'btn-primary' : '',
                  'w-full py-3 px-4',
                  'flex items-center justify-center gap-2',
                  isFailed
                    ? 'bg-neo-orange text-neo-black'
                    : 'bg-neo-white/10 text-neo-white',
                  'font-black text-lg',
                  'border-3 border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  'transition-all duration-200'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                {t('adventure.retryLevel')}
              </button>

              {/* Exit Button */}
              <button
                onClick={onExit}
                className={cn(
                  'w-full py-2 px-4',
                  'flex items-center justify-center gap-2',
                  'bg-transparent text-neo-white/70',
                  'font-bold text-base',
                  'hover:text-neo-white hover:bg-neo-white/5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-lime',
                  'rounded-neo transition-all duration-200'
                )}
              >
                <LogOut className="w-4 h-4" />
                {t('common.exit')}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }
);

LevelCompleteModal.displayName = 'LevelCompleteModal';

export default LevelCompleteModal;
