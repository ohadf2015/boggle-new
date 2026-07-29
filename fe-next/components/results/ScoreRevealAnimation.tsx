'use client';

import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
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
    customAvatar?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
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
      <m.div
        key={player.username}
        layout={enableComplexAnimations && isRevealing}
        initial={shouldAnimate ? { opacity: 0, x: -30, scale: 0.95 } : false}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{
          layout: { type: 'spring', stiffness: 250, damping: 25 },
          opacity: { duration: 0.3 },
          scale: { type: 'spring', stiffness: 300, damping: 20 },
        }}
        className={cn(
          'flex items-center gap-3 p-2.5 rounded-neo border-3 border-neo-black transition-colors duration-300 relative overflow-hidden',
          isTop3
            ? position === 0
              ? 'bg-linear-to-r from-neo-lime/20 via-neo-lime/10 to-neo-lime/20 border-neo-lime'
              : position === 1
                ? 'bg-linear-to-r from-slate-400/15 via-slate-300/10 to-slate-400/15 border-slate-400'
                : 'bg-linear-to-r from-neo-orange/15 via-neo-orange/10 to-neo-orange/15 border-neo-orange'
            : 'bg-neo-navy-light/60 border-slate-700',
          isCurrentPlayer && 'ring-2 ring-neo-cyan ring-offset-1 ring-offset-neo-navy',
          'shadow-hard-sm',
          // Flash highlight when position just swapped
          lastPositionSwap && sortedByDisplayed[position]?.username === player.username && 'border-neo-lime shadow-[0_0_16px_rgba(191,255,0,0.25)]'
        )}
      >
        {/* Halftone texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(circle,#fff_1px,transparent_1px)] bg-size-[8px_8px]" />

        {/* Rank badge */}
        <div className={cn(
          'w-8 h-8 flex items-center justify-center border-3 border-neo-black font-neo-display shrink-0',
          isTop3
            ? position === 0 ? 'bg-neo-lime text-neo-black' : position === 1 ? 'bg-slate-300 text-slate-800' : 'bg-neo-orange text-neo-black'
            : 'bg-neo-black text-white'
        )}>
          {isTop3 ? (
            <RankIcon className="w-4 h-4" />
          ) : (
            <span className="text-sm font-black">{position + 1}</span>
          )}
        </div>

        {/* Avatar */}
        <Avatar
          userId={player.username}
          customAvatar={player.avatar?.customAvatar}
          size="sm"
          className="border-2 border-neo-black shrink-0"
        />

        {/* Name */}
        <div className="flex-1 min-w-0 relative z-10">
          <p className={cn(
            'font-neo-display uppercase truncate text-sm',
            isTop3 ? 'text-white' : 'text-white'
          )}>
            {player.username}
            {isCurrentPlayer && <span className="text-neo-cyan ms-1">*</span>}
          </p>
        </div>

        {/* Animated score */}
        <m.div
          key={score}
          initial={isRevealing ? { scale: 1.1 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'px-3 py-1 border-3 border-neo-black font-black text-lg tabular-nums relative z-10',
            isTop3
              ? position === 0 ? 'bg-neo-black text-neo-lime' : position === 1 ? 'bg-neo-black text-slate-300' : 'bg-neo-black text-neo-orange'
              : 'bg-neo-black/60 text-white'
          )}
        >
          {score.toLocaleString()}
        </m.div>

        {/* Position change indicator */}
        <AnimatePresence>
          {lastPositionSwap &&
           sortedByDisplayed[position]?.username === player.username &&
           enableComplexAnimations && (
            <m.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-e-0 -top-2"
            >
              <Zap className="w-4 h-4 text-neo-lime" />
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    );
  }, [displayedScores, currentUsername, isRevealing, lastPositionSwap, sortedByDisplayed, enableComplexAnimations, shouldAnimate]);

  return (
    <div className="space-y-2 relative">
      {/* Reveal progress bar (only during animation) */}
      {isRevealing && enableComplexAnimations && (
        <m.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          className="h-2 bg-neo-black border-3 border-slate-700 overflow-hidden mb-3 shadow-hard-sm"
        >
          <m.div
            className="h-full bg-linear-to-r from-neo-lime via-neo-cyan to-neo-lime"
            style={{
              boxShadow: '0 0 12px var(--neo-lime, #BFFF00)',
              backgroundSize: '200% 100%',
            }}
            initial={{ width: '0%' }}
            animate={{ width: '100%', backgroundPosition: ['0% 0', '100% 0'] }}
            transition={{
              width: { duration: clampedDuration / 1000, ease: 'easeOut' },
              backgroundPosition: { duration: 1, repeat: Infinity, ease: 'linear' },
            }}
          />
        </m.div>
      )}

      {/* Player list - sorted by current displayed scores */}
      <AnimatePresence mode="popLayout">
        {sortedByDisplayed.map((player, position) => renderPlayer(player, position))}
      </AnimatePresence>

      {/* "Trading places" indicator during reveal */}
      {isRevealing && lastPositionSwap && enableComplexAnimations && (
        <m.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="flex justify-end"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border-3 border-neo-black bg-neo-pink shadow-hard-sm text-xs font-black text-neo-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5" />
            {t('results.positionSwap')}
          </div>
        </m.div>
      )}

      {/* Skip button — appears after 1s */}
      {isRevealing && canSkip && (
        <m.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleSkip}
          className="flex items-center justify-center gap-1.5 mx-auto mt-1 px-3 py-1.5 border-3 border-slate-700 bg-neo-black hover:bg-neo-navy-light text-[10px] font-black text-neo-white uppercase tracking-widest shadow-hard-sm hover:text-neo-white transition-colors"
        >
          <SkipForward className="w-3 h-3" />
          {t('results.skipReveal')}
        </m.button>
      )}
    </div>
  );
});

ScoreRevealAnimation.displayName = 'ScoreRevealAnimation';

export default ScoreRevealAnimation;
