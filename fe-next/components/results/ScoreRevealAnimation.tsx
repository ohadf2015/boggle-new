'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, Star, Zap, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireRankConfetti } from '@/utils/confettiUtils';
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
  3: { bg: 'bg-neo-orange', text: 'text-neo-black', icon: Medal },
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

  const { t } = useLanguage();

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

  // Skip mechanism — allow tap-to-skip after 1s
  const [canSkip, setCanSkip] = useState(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!shouldAnimate) return;
    skipTimerRef.current = setTimeout(() => setCanSkip(true), 1000);
    return () => { if (skipTimerRef.current) clearTimeout(skipTimerRef.current); };
  }, [shouldAnimate]);

  const handleSkip = useCallback(() => {
    if (!isRevealing) return;
    setDisplayedScores(players.reduce((acc, p) => ({ ...acc, [p.username]: p.finalScore }), {}));
    setIsRevealing(false);
    if (enableComplexAnimations) {
      playAchievementSound();
      fireRankConfetti(1, 'light');
    }
    onComplete?.();
  }, [isRevealing, players, enableComplexAnimations, playAchievementSound, onComplete]);

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

  // Track previous positions for swap detection (ref to avoid re-render loops)
  const prevPositionsRef = useRef<Record<string, number>>({});

  // Detect position swaps and play sounds
  useEffect(() => {
    const currentPositions = sortedByDisplayed.reduce(
      (acc, p, idx) => ({ ...acc, [p.username]: idx }),
      {} as Record<string, number>
    );

    // Check for position changes
    const prevPositions = prevPositionsRef.current;
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

    prevPositionsRef.current = currentPositions;
  }, [sortedByDisplayed, isRevealing, playSound, isLowEnd]);

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
        // Play achievement sound + confetti burst for dramatic finish
        if (enableComplexAnimations) {
          playAchievementSound();
          fireRankConfetti(1, 'light');
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
          'flex items-center gap-3 p-2 rounded-neo border-2 border-neo-black transition-colors duration-300',
          isTop3 ? rankStyle.bg : 'bg-neo-cream',
          isCurrentPlayer && 'ring-2 ring-neo-cyan ring-offset-1',
          'shadow-hard-sm',
          // Flash highlight when position just swapped
          lastPositionSwap && sortedByDisplayed[position]?.username === player.username && 'bg-neo-lime/20'
        )}
      >
        {/* Rank badge */}
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center border-2 border-neo-black',
          isTop3 ? 'bg-neo-cream' : 'bg-neo-cream/80'
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
            isTop3 ? rankStyle.text : 'text-neo-black'
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
            isTop3 ? 'bg-neo-cream text-neo-black' : 'bg-neo-cream/80 text-neo-black'
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
          className="h-1 bg-white/10 rounded-full overflow-hidden mb-3"
        >
          <motion.div
            className="h-full bg-neo-lime"
            style={{ boxShadow: '0 0 12px var(--neo-lime, #BFFF00), 0 0 4px var(--neo-lime, #BFFF00)' }}
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
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="flex justify-end"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-neo border-2 border-neo-pink bg-neo-pink/20 text-xs font-bold text-neo-pink uppercase tracking-wide shadow-hard-sm">
            <Zap className="w-3 h-3" />
            {t('results.positionSwap')}
          </div>
        </motion.div>
      )}

      {/* Skip button — appears after 1s */}
      {isRevealing && canSkip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleSkip}
          className="flex items-center justify-center gap-1.5 mx-auto mt-1 px-3 py-1.5 rounded-neo border-2 border-white/20 bg-white/5 hover:bg-white/10 text-[10px] font-bold text-neo-cream/60 uppercase tracking-wide transition-colors"
        >
          <SkipForward className="w-3 h-3" />
          {t('results.skipReveal')}
        </motion.button>
      )}
    </div>
  );
});

ScoreRevealAnimation.displayName = 'ScoreRevealAnimation';

export default ScoreRevealAnimation;
