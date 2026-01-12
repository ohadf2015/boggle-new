'use client';

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import Avatar from '../Avatar';

/**
 * Player data for scoring reveal
 */
export interface ScoreRevealPlayer {
  username: string;
  finalScore: number;
  avatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string | null;
    avatarImage?: string;
  };
  isCurrentPlayer?: boolean;
}

interface ScoreRevealAnimationProps {
  /** Players sorted by final score (highest first) */
  players: ScoreRevealPlayer[];
  /** Duration of the reveal in milliseconds (default: 2500ms, max 3000ms) */
  duration?: number;
  /** Callback when reveal animation completes */
  onComplete?: () => void;
  /** Whether to show the animation (false = show final state immediately) */
  animate?: boolean;
  /** Current player username for highlighting */
  currentUsername?: string;
}

// Rank styling configuration
const RANK_STYLES: Record<number, { bg: string; text: string; icon: typeof Crown }> = {
  1: { bg: 'bg-neo-lime', text: 'text-neo-black', icon: Crown },
  2: { bg: 'bg-slate-300', text: 'text-slate-700', icon: Medal },
  3: { bg: 'bg-orange-400', text: 'text-neo-black', icon: Medal },
};

/**
 * ScoreRevealAnimation - Netflix Boggle Party-inspired scoring reveal
 *
 * Features:
 * - Scores count up incrementally from 0 to final values
 * - Positions swap dynamically as scores are revealed
 * - Sound effects play on position changes
 * - Respects reduced motion preferences
 * - Adapts to low-end devices
 *
 * Mobile Safety:
 * - Animation runs in existing container (no layout shifts)
 * - Max 3 seconds duration to avoid frustration
 * - Simplified on low-end devices
 * - Skip animation if prefers-reduced-motion
 */
const ScoreRevealAnimation = memo<ScoreRevealAnimationProps>(({
  players,
  duration = 2500,
  onComplete,
  animate = true,
  currentUsername,
}) => {
  // Clamp duration to max 3 seconds
  const clampedDuration = Math.min(duration, 3000);

  // Device performance detection
  const { prefersReducedMotion, isLowEnd, enableComplexAnimations } = useDevicePerformance();

  // Sound effects
  const { playSound, playAchievementSound } = useSoundEffects();

  // If reduced motion or no animation, skip
  const shouldAnimate = animate && !prefersReducedMotion;

  // State: current displayed scores (animated from 0 to final)
  const [displayedScores, setDisplayedScores] = useState<Record<string, number>>(() => {
    if (!shouldAnimate) {
      // Immediately show final scores
      return players.reduce((acc, p) => ({ ...acc, [p.username]: p.finalScore }), {});
    }
    // Start at 0
    return players.reduce((acc, p) => ({ ...acc, [p.username]: 0 }), {});
  });

  // Track animation state
  const [isRevealing, setIsRevealing] = useState(shouldAnimate);
  const [lastPositionSwap, setLastPositionSwap] = useState<{ from: number; to: number } | null>(null);

  // Get max score for progress calculation
  const maxScore = useMemo(() =>
    Math.max(...players.map(p => p.finalScore), 1),
    [players]
  );

  // Calculate current positions based on displayed scores
  const sortedByDisplayed = useMemo(() => {
    return [...players].sort((a, b) => {
      const scoreA = displayedScores[a.username] || 0;
      const scoreB = displayedScores[b.username] || 0;
      // Stable sort: if scores equal, maintain original order
      if (scoreA === scoreB) {
        return players.indexOf(a) - players.indexOf(b);
      }
      return scoreB - scoreA;
    });
  }, [players, displayedScores]);

  // Track previous positions for swap detection
  const [prevPositions, setPrevPositions] = useState<Record<string, number>>({});

  // Detect position swaps and play sounds
  useEffect(() => {
    const currentPositions = sortedByDisplayed.reduce(
      (acc, p, idx) => ({ ...acc, [p.username]: idx }),
      {} as Record<string, number>
    );

    // Check for position changes
    Object.keys(currentPositions).forEach(username => {
      const prev = prevPositions[username];
      const curr = currentPositions[username];

      if (prev !== undefined && prev !== curr && isRevealing) {
        // Position changed - play swap sound
        setLastPositionSwap({ from: prev, to: curr });

        // Play sound for position change (use word accepted sound for subtle feedback)
        if (!isLowEnd) {
          playSound('wordAccepted', { volume: 0.4, requiresGameActive: false });
        }
      }
    });

    setPrevPositions(currentPositions);
  }, [sortedByDisplayed, prevPositions, isRevealing, playSound, isLowEnd]);

  // Animate scores counting up
  useEffect(() => {
    if (!shouldAnimate) {
      onComplete?.();
      return;
    }

    const startTime = performance.now();
    const updateInterval = isLowEnd ? 100 : 50; // Less frequent updates on low-end
    let animationFrame: number;

    const updateScores = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / clampedDuration, 1);

      // Easing function: ease-out cubic for dramatic slowdown at end
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Update all scores based on progress
      const newScores = players.reduce((acc, player) => ({
        ...acc,
        [player.username]: Math.round(player.finalScore * easedProgress),
      }), {} as Record<string, number>);

      setDisplayedScores(newScores);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(() => {
          setTimeout(updateScores, updateInterval);
        });
      } else {
        // Animation complete
        setIsRevealing(false);
        // Play achievement sound for dramatic finish
        if (enableComplexAnimations) {
          playAchievementSound();
        }
        onComplete?.();
      }
    };

    // Start animation after small delay for mount
    const startTimeout = setTimeout(updateScores, 100);

    return () => {
      clearTimeout(startTimeout);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [shouldAnimate, clampedDuration, players, isLowEnd, enableComplexAnimations, playAchievementSound, onComplete]);

  // Render player row
  const renderPlayer = useCallback((player: ScoreRevealPlayer, position: number) => {
    const score = displayedScores[player.username] || 0;
    const isTop3 = position < 3;
    const rankStyle = RANK_STYLES[position + 1] || { bg: 'bg-slate-200', text: 'text-slate-700', icon: Star };
    const RankIcon = rankStyle.icon;
    const isCurrentPlayer = player.isCurrentPlayer ?? player.username === currentUsername;

    return (
      <motion.div
        key={player.username}
        layout={enableComplexAnimations && isRevealing}
        initial={shouldAnimate ? { opacity: 0, x: -20 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          layout: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.3 },
        }}
        className={cn(
          'flex items-center gap-3 p-2 rounded-neo border-2 border-neo-black',
          isTop3 ? rankStyle.bg : 'bg-white dark:bg-slate-800',
          isCurrentPlayer && 'ring-2 ring-neo-cyan ring-offset-1',
          'shadow-hard-sm'
        )}
      >
        {/* Rank badge */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center border-2 border-neo-black',
          isTop3 ? 'bg-neo-cream' : 'bg-slate-100'
        )}>
          {isTop3 ? (
            <RankIcon className={cn('w-4 h-4', rankStyle.text)} />
          ) : (
            <span className="text-sm font-black text-slate-600">{position + 1}</span>
          )}
        </div>

        {/* Avatar */}
        <Avatar
          profilePictureUrl={player.avatar?.profilePictureUrl ?? undefined}
          avatarImage={player.avatar?.avatarImage}
          size="sm"
          className="border-2 border-neo-black"
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'font-bold truncate',
            isTop3 ? rankStyle.text : 'text-neo-black dark:text-white'
          )}>
            {player.username}
            {isCurrentPlayer && <span className="text-neo-cyan ms-1">*</span>}
          </p>
        </div>

        {/* Animated score */}
        <motion.div
          key={score}
          initial={isRevealing ? { scale: 1.1 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'px-3 py-1 rounded-neo border-2 border-neo-black font-black text-lg',
            isTop3 ? 'bg-neo-cream text-neo-black' : 'bg-slate-100 text-neo-black'
          )}
        >
          {score}
        </motion.div>

        {/* Position change indicator */}
        <AnimatePresence>
          {lastPositionSwap &&
           sortedByDisplayed[position]?.username === player.username &&
           enableComplexAnimations && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute end-0 -top-2"
            >
              <Zap className="w-4 h-4 text-neo-lime" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }, [displayedScores, currentUsername, isRevealing, lastPositionSwap, sortedByDisplayed, enableComplexAnimations, shouldAnimate]);

  return (
    <div className="space-y-2 relative">
      {/* Reveal progress bar (only during animation) */}
      {isRevealing && enableComplexAnimations && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3"
        >
          <motion.div
            className="h-full bg-neo-lime"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: clampedDuration / 1000, ease: 'easeOut' }}
          />
        </motion.div>
      )}

      {/* Player list - sorted by current displayed scores */}
      <AnimatePresence mode="popLayout">
        {sortedByDisplayed.map((player, position) => renderPlayer(player, position))}
      </AnimatePresence>

      {/* "Trading places" indicator during reveal */}
      {isRevealing && lastPositionSwap && enableComplexAnimations && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-center text-xs font-bold text-neo-pink uppercase tracking-wide py-1"
        >
          Position swap!
        </motion.div>
      )}
    </div>
  );
});

ScoreRevealAnimation.displayName = 'ScoreRevealAnimation';

export default ScoreRevealAnimation;
