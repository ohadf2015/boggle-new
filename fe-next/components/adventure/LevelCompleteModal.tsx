/**
 * LevelCompleteModal Component
 *
 * Displays level completion results with stars, score, and objectives summary.
 * Shows celebration effects for perfect scores (3 stars).
 */

'use client';

import React, { memo, useMemo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, X, Trophy, RotateCcw, LogOut, Sparkles, Coins, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParallax } from '@/hooks/useParallax';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useParticleBudget } from '@/hooks/useParticleBudget';
import { InteractiveMascot, type ExtendedMascotVariant } from '@/components/ui/InteractiveMascot';
import { OBJECTIVE_TRANSLATION_KEYS } from '@/lib/adventure/constants';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { RollingNumber } from './ui/RollingNumber';
import type { LevelObjective, ObjectiveType, LevelAttempt } from '@/types/adventure';

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

// ==============================================
// CONSTANTS
// ==============================================

const PARTICLE_COUNT = 20;

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
  return 'thinking';                      // No stars? Thoughtful
}

/**
 * Get the background glow gradient based on stars earned.
 * Higher star counts produce warmer, more vibrant glows.
 */
function getGlowGradient(stars: number): string {
  if (stars >= 3) {
    return 'radial-gradient(ellipse at 50% 30%, rgba(255,225,53,0.2) 0%, transparent 60%)';
  }
  if (stars >= 2) {
    return 'radial-gradient(ellipse at 50% 30%, rgba(163,230,53,0.15) 0%, transparent 60%)';
  }
  if (stars >= 1) {
    return 'radial-gradient(ellipse at 50% 30%, rgba(34,211,238,0.12) 0%, transparent 60%)';
  }
  return 'radial-gradient(ellipse at 50% 30%, rgba(239,68,68,0.1) 0%, transparent 60%)';
}

// Simple seeded pseudo-random number generator for deterministic particles
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// ==============================================
// HELPER COMPONENTS
// ==============================================

const StarDisplay = memo<{ filled: boolean; index: number }>(
  ({ filled, index }) => (
    <motion.div
      data-testid={filled ? 'star-filled' : 'star-empty'}
      className={cn(
        `star-animate-${index + 1}`,
        'transition-all duration-300'
      )}
      initial={{ scale: 0, rotate: -180 }}
      animate={filled ? {
        scale: [0, 1.3, 1], // Overshoot for pop effect
        rotate: [180, -10, 0]
      } : {
        scale: 1,
        rotate: 0
      }}
      transition={{
        delay: 0.4 + index * 0.25, // Slightly longer stagger for emphasis
        type: 'spring',
        stiffness: 180,
        damping: 12,
        bounce: 0.6, // More bounce for celebratory feel
      }}
    >
      <Star
        className={cn(
          'w-12 h-12 md:w-16 md:h-16',
          filled
            ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_15px_rgba(255,225,53,0.9)]'
            : 'text-neo-white/30 fill-transparent'
        )}
      />
    </motion.div>
  )
);

StarDisplay.displayName = 'StarDisplay';

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

    // Enhanced parallax for celebration - dramatic intensity scales with stars
    const PARALLAX_INTENSITY_BY_STARS: Record<number, number> = { 3: 1.5, 2: 1.0, 1: 0.6 };
    const parallaxIntensity = PARALLAX_INTENSITY_BY_STARS[stars] ?? 0.3;
    const { x: parallaxX, y: parallaxY } = useParallax({
      intensity: parallaxIntensity,
      enableGyroscope: true,
      enableGesture: true,
      enableAmbient: true,
      ambientSpeed: isPerfect ? 1.0 : 0.5, // Faster ambient for perfect scores
    });

    // Count completed objectives
    const completedCount = useMemo(
      () => objectives.filter((o) => o.isComplete).length,
      [objectives]
    );

    // Format score with commas
    const formattedScore = useMemo(
      () => score.toLocaleString(),
      [score]
    );

    // Pre-compute celebration particle configurations (deterministic)
    const particleConfigs = useMemo(() => {
      return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        x: seededRandom(i * 3 + 1) * 100,
        y: seededRandom(i * 3 + 2) * 100,
        delay: seededRandom(i * 3 + 3) * 0.5,
        repeatDelay: seededRandom(i * 3 + 4) * 2,
      }));
    }, []);

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
          {/* Parallax celebration background - responds to device movement */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Deep glow layer - slowest movement */}
            <motion.div
              className="absolute inset-0"
              style={{
                transform: `translate(${parallaxX * 0.1}px, ${parallaxY * 0.1}px)`,
                background: getGlowGradient(stars),
              }}
              animate={isPerfect ? {
                scale: [1, 1.1, 1],
                opacity: [0.8, 1, 0.8],
              } : undefined}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            {/* Mid layer - star burst rays */}
            {stars > 0 && (
              <motion.div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
                style={{
                  transform: `translate(calc(-50% + ${parallaxX * 0.25}px), calc(-50% + ${parallaxY * 0.25}px))`,
                  background: isPerfect
                    ? 'conic-gradient(from 0deg, transparent, rgba(255,225,53,0.08) 10%, transparent 20%)'
                    : 'conic-gradient(from 0deg, transparent, rgba(163,230,53,0.05) 10%, transparent 20%)',
                }}
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: isPerfect ? 20 : 40,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            )}

            {/* Near layer - floating orbs */}
            {isPerfect && (
              <>
                <motion.div
                  className="absolute top-[20%] left-[15%] w-24 h-24 rounded-full"
                  style={{
                    transform: `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)`,
                    background: 'radial-gradient(circle, rgba(255,225,53,0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0.8, 0.5],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <motion.div
                  className="absolute bottom-[25%] right-[10%] w-32 h-32 rounded-full"
                  style={{
                    transform: `translate(${parallaxX * 0.6}px, ${parallaxY * 0.6}px)`,
                    background: 'radial-gradient(circle, rgba(255,225,53,0.25) 0%, transparent 70%)',
                    filter: 'blur(25px)',
                  }}
                  animate={{
                    scale: [1.2, 1, 1.2],
                    opacity: [0.6, 0.4, 0.6],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                />
              </>
            )}
          </div>

          {/* Celebration particles for any star completion (scaled by star count) */}
          {stars > 0 && (
            <div className="celebration-effect absolute inset-0 pointer-events-none overflow-hidden">
              {particleConfigs.slice(0, Math.floor(PARTICLE_COUNT * (stars / 3))).map((config, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    'absolute w-2 h-2 rounded-full',
                    // Color varies based on stars
                    isPerfect ? 'bg-neo-yellow' : stars === 2 ? 'bg-neo-lime' : 'bg-neo-cyan'
                  )}
                  initial={{
                    x: '50vw',
                    y: '50vh',
                    scale: 0,
                  }}
                  animate={{
                    x: `${config.x}vw`,
                    y: `${config.y}vh`,
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    delay: config.delay,
                    repeat: isPerfect ? Infinity : 0, // Only loop for perfect
                    repeatDelay: config.repeatDelay,
                  }}
                />
              ))}
            </div>
          )}

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
                  isFailed ? 'text-neo-red' : isPerfect 
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-neo-yellow via-neo-pink to-neo-cyan'
                    : 'text-neo-white'
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
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className={cn(
                  'text-center text-xl font-black text-neo-yellow',
                  'mb-4 drop-shadow-[0_0_10px_rgba(255,225,53,0.6)]'
                )}
              >
                {t('adventure.game.perfect')}
              </motion.p>
            )}

            {/* Stars with enhanced animation */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: i < stars ? 1 : 0.6, 
                    rotate: 0,
                    opacity: i < stars ? 1 : 0.3,
                  }}
                  transition={{ 
                    delay: 0.4 + i * 0.15, 
                    type: 'spring', 
                    stiffness: 200,
                    damping: 15,
                  }}
                  className="relative"
                >
                  <Star
                    className={cn(
                      'w-14 h-14 md:w-18 md:h-18 transition-all duration-300',
                      i < stars
                        ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_20px_rgba(255,225,53,0.8)]'
                        : 'text-neo-white/30 fill-transparent'
                    )}
                  />
                  {/* Sparkle effect for earned stars */}
                  {i < stars && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: [0, 2, 2], opacity: [1, 1, 0] }}
                      transition={{ delay: 0.6 + i * 0.15, duration: 0.6 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Sparkles className="w-8 h-8 text-neo-yellow" />
                    </motion.div>
                  )}
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
