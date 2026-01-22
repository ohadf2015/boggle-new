/**
 * LevelCompleteModal Component
 *
 * Displays level completion results with stars, score, and objectives summary.
 * Shows celebration effects for perfect scores (3 stars).
 */

'use client';

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Check, X, Trophy, RotateCcw, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LevelObjective, ObjectiveType } from '@/types/adventure';

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
}

// ==============================================
// CONSTANTS
// ==============================================

const OBJECTIVE_LABELS: Record<ObjectiveType, string> = {
  wordCount: 'Find Words',
  scoreTarget: 'Score Points',
  longWords: 'Long Words',
  clearIce: 'Clear Ice',
  timeBonus: 'Time Bonus',
  collectGems: 'Collect Gems',
};

const PARTICLE_COUNT = 20;

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
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        delay: 0.3 + index * 0.2,
        type: 'spring',
        stiffness: 200,
        damping: 15,
      }}
    >
      <Star
        className={cn(
          'w-12 h-12 md:w-16 md:h-16',
          filled
            ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_10px_rgba(255,225,53,0.8)]'
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
  }) => {
    const isPerfect = stars === 3;
    const isFailed = stars === 0;

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
          {/* Celebration particles for perfect score */}
          {isPerfect && (
            <div className="celebration-effect absolute inset-0 pointer-events-none overflow-hidden">
              {particleConfigs.map((config, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-neo-yellow"
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
                    repeat: Infinity,
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
            {/* Title */}
            <h2
              id="level-complete-title"
              className={cn(
                'text-center text-2xl md:text-3xl font-black',
                'mb-2',
                isFailed ? 'text-neo-red' : 'text-neo-white'
              )}
            >
              {isFailed ? 'Try Again!' : 'Level Complete!'}
            </h2>

            {/* Level Number */}
            <p className="text-center text-neo-white/70 font-bold mb-4">
              Level {levelNumber}
            </p>

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
                Perfect!
              </motion.p>
            )}

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-6">
              {[0, 1, 2].map((i) => (
                <StarDisplay key={i} filled={i < stars} index={i} />
              ))}
            </div>

            {/* Score */}
            <div className="text-center mb-6">
              <p className="text-neo-white/60 text-sm font-bold uppercase tracking-wide">
                Score
              </p>
              <p className="text-3xl md:text-4xl font-black text-neo-white">
                {formattedScore}
              </p>
              {isHighScore && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-neo-lime font-bold mt-1 flex items-center justify-center gap-1"
                >
                  <Trophy className="w-4 h-4" />
                  New High Score!
                </motion.p>
              )}
            </div>

            {/* Objectives Summary */}
            <div className="mb-6">
              <p className="text-neo-white/60 text-sm font-bold mb-2">
                Objectives: {completedCount}/{objectives.length}
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
                    <span>{OBJECTIVE_LABELS[objective.type]}</span>
                    <span className="ml-auto font-mono">
                      {objective.current}/{objective.target}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

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
                    'shadow-hard hover:shadow-hard-sm',
                    'transition-all duration-200',
                    'hover:translate-x-[2px] hover:translate-y-[2px]',
                    'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  )}
                >
                  Continue
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
                  'shadow-hard hover:shadow-hard-sm',
                  'transition-all duration-200',
                  'hover:translate-x-[2px] hover:translate-y-[2px]',
                  'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                )}
              >
                <RotateCcw className="w-5 h-5" />
                Retry
              </button>

              {/* Exit Button */}
              <button
                onClick={onExit}
                className={cn(
                  'w-full py-2 px-4',
                  'flex items-center justify-center gap-2',
                  'bg-transparent text-neo-white/70',
                  'font-bold text-base',
                  'hover:text-neo-white',
                  'transition-colors duration-200'
                )}
              >
                <LogOut className="w-4 h-4" />
                Exit
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
