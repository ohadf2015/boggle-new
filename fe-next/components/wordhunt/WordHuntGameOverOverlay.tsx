'use client';

import React, { useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Skull, Eye, Trophy, Sparkles, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { wordHuntSolveTier } from '@/shared/utils/wordHuntScoring';
import { WordHuntDeathRecap, type DeathRecapStats } from './WordHuntDeathRecap';

export type GameOverReason = 'eliminated' | 'found' | 'otherFound' | null;

export interface WordHuntGameOverOverlayProps {
  reason: GameOverReason;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Death recap stats — only needed when reason is 'eliminated' */
  deathRecapStats?: DeathRecapStats | null;
  /**
   * Live count of players still hunting the target. Word Hunt is one shared
   * board, so a spectating (eliminated) player has no per-player board to
   * watch — this count is the live shared signal that keeps the spectator
   * state feeling alive instead of stuck on a frozen grid.
   */
  playersRemaining?: number;
  /**
   * Same-length guesses the local player used to solve the target. Drives the
   * Wordle-style celebration escalation (guess 1 = "Genius", bigger burst).
   * Only meaningful when reason === 'found'.
   */
  attemptsToFind?: number;
}

const SPECTATOR_DELAY = 2800;
const RECAP_DELAY = 1200; // Show recap card 1.2s after impact
const RECAP_DURATION = 6000; // Recap stays for 6s before spectator

/**
 * Dramatic game-over overlay for Word Hunt multiplayer.
 *
 * Two modes:
 * - **Eliminated**: Red vignette, skull slam, screen shake → spectator fade
 * - **Found target**: Gold burst, trophy, confetti-like particles → spectator fade
 *
 * Both transition to a semi-transparent spectator state so the player
 * can still watch the board and leaderboard.
 */
export const WordHuntGameOverOverlay: React.FC<WordHuntGameOverOverlayProps> = ({
  reason,
  t,
  deathRecapStats,
  playersRemaining,
  attemptsToFind,
}) => {
  const [phase, setPhase] = useState<'impact' | 'recap' | 'spectator'>('impact');

  // Celebration escalation for a personal win — fewer guesses → grander tier.
  // Only when the guess count is known; otherwise the generic "you found it".
  const solveTier =
    reason === 'found' && typeof attemptsToFind === 'number'
      ? wordHuntSolveTier(attemptsToFind)
      : null;

  useEffect(() => {
    if (!reason) {
      setPhase('impact');
      return;
    }

    const isElim = reason === 'eliminated';
    const hasRecap = isElim && deathRecapStats;

    if (hasRecap) {
      // Eliminated with recap: impact → recap → spectator
      const recapTimer = setTimeout(() => setPhase('recap'), RECAP_DELAY);
      const spectatorTimer = setTimeout(
        () => setPhase('spectator'),
        RECAP_DELAY + RECAP_DURATION,
      );
      return () => {
        clearTimeout(recapTimer);
        clearTimeout(spectatorTimer);
      };
    }

    // Victory or no recap: impact → spectator
    const timer = setTimeout(() => setPhase('spectator'), SPECTATOR_DELAY);
    return () => clearTimeout(timer);
  }, [reason, deathRecapStats]);

  if (!reason) return null;

  const isEliminated = reason === 'eliminated';
  const isOtherFound = reason === 'otherFound';

  return (
    <AdaptiveAnimatePresence>
      <AdaptiveMotion.div
        key="gameover-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden"
      >
        {/* Vignette — red for death, gold for victory, blue for other found */}
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'impact' ? 1 : 0.2 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
          style={{
            background: isEliminated
              ? 'radial-gradient(ellipse at center, transparent 30%, rgba(220, 38, 38, 0.6) 100%)'
              : isOtherFound
              ? 'radial-gradient(ellipse at center, transparent 30%, rgba(59, 130, 246, 0.5) 100%)'
              : 'radial-gradient(ellipse at center, transparent 30%, rgba(234, 179, 8, 0.5) 100%)',
          }}
        />

        {/* Dark overlay for spectator */}
        <AdaptiveMotion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'spectator' ? 0.4 : 0.15 }}
          transition={{ duration: 0.6, delay: phase === 'spectator' ? 0 : 0.3 }}
          className="absolute inset-0 bg-neo-black"
        />

        {/* Floating particles for personal victory only — denser for top tiers */}
        {!isEliminated && !isOtherFound && phase === 'impact' && (
          <VictoryParticles count={solveTier && solveTier.tier <= 1 ? 24 : 12} />
        )}

        {/* Content */}
        <AdaptiveAnimatePresence mode="wait">
          {phase === 'impact' ? (
            <ImpactContent key="impact" isEliminated={isEliminated} isOtherFound={isOtherFound} solveTier={solveTier} t={t} />
          ) : phase === 'recap' && isEliminated && deathRecapStats ? (
            <WordHuntDeathRecap key="recap" stats={deathRecapStats} t={t} />
          ) : (
            <SpectatorContent key="spectator" t={t} playersRemaining={playersRemaining} />
          )}
        </AdaptiveAnimatePresence>
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
};

WordHuntGameOverOverlay.displayName = 'WordHuntGameOverOverlay';

/** Dramatic impact animation — skull for death, trophy for victory, eye for other found */
const ImpactContent: React.FC<{
  isEliminated: boolean;
  isOtherFound: boolean;
  solveTier: ReturnType<typeof wordHuntSolveTier> | null;
  t: (key: string) => string;
}> = ({
  isEliminated,
  isOtherFound,
  solveTier,
  t,
}) => (
  <AdaptiveMotion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}
    className="relative flex flex-col items-center gap-4"
  >
    {/* Icon — skull or trophy */}
    <AdaptiveMotion.div
      initial={{ scale: 0, rotate: isEliminated ? -15 : 0 }}
      animate={{
        scale: [0, 1.4, 1],
        rotate: isEliminated ? [-15, 10, -5, 0] : [0, -8, 8, 0],
      }}
      transition={{ duration: 0.6, times: [0, 0.6, 1], ease: 'easeOut' }}
    >
      {isEliminated ? (
        <Skull
          size={72}
          className="text-neo-red drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]"
          strokeWidth={2.5}
        />
      ) : isOtherFound ? (
        <Eye
          size={72}
          className="text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.8)]"
          strokeWidth={2.5}
        />
      ) : solveTier?.isAce ? (
        // Guess 1 — crown the genius
        <Crown
          size={88}
          className="text-yellow-300 drop-shadow-[0_0_28px_rgba(253,224,71,0.95)]"
          strokeWidth={2.5}
        />
      ) : solveTier && solveTier.tier === 1 ? (
        // Guess 2 — electric
        <Zap
          size={80}
          className="text-yellow-300 drop-shadow-[0_0_24px_rgba(253,224,71,0.9)]"
          strokeWidth={2.5}
        />
      ) : (
        <Trophy
          size={72}
          className="text-yellow-400 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]"
          strokeWidth={2.5}
        />
      )}
    </AdaptiveMotion.div>

    {/* Banner text */}
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.5, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, type: 'spring', stiffness: 200 }}
      className={cn(
        'px-6 py-3 rounded-neo border-3 shadow-hard-lg',
        'font-neo-display text-2xl sm:text-3xl font-black uppercase tracking-wider',
        isEliminated
          ? 'border-neo-red bg-neo-red/90 text-neo-white'
          : isOtherFound
          ? 'border-blue-500 bg-blue-500/90 text-neo-white'
          : 'border-yellow-500 bg-yellow-500/90 text-neo-black',
      )}
    >
      {isEliminated
        ? t('wordHunt.mp.youEliminated')
        : isOtherFound
        ? t('wordHunt.mp.someoneFoundIt')
        : solveTier
        ? t(solveTier.labelKey)
        : t('wordHunt.mp.youFoundIt')}
    </AdaptiveMotion.div>

    {/* Subtitle */}
    <AdaptiveMotion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2, duration: 0.5 }}
      className="text-neo-white font-neo-body text-sm"
    >
      {t('wordHunt.mp.watchOthers')}
    </AdaptiveMotion.p>

    {/* Screen shake for elimination */}
    {isEliminated && (
      <AdaptiveMotion.div
        initial={{ x: 0 }}
        animate={{ x: [0, -8, 8, -6, 6, -3, 3, 0] }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="absolute inset-0 pointer-events-none"
      />
    )}
  </AdaptiveMotion.div>
);

/** Spectator mode — watching indicator + live "still hunting" count */
const SpectatorContent: React.FC<{
  t: (key: string, params?: Record<string, string | number>) => string;
  playersRemaining?: number;
}> = ({ t, playersRemaining }) => (
  <AdaptiveMotion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="relative flex flex-col items-center gap-2"
  >
    <div className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-white/30 bg-neo-black/60">
      <Eye size={18} className="text-neo-white" />
      <span className="text-neo-white font-neo-body text-sm font-medium">
        {t('wordHunt.mp.watchOthers')}
      </span>
    </div>
    {/* Live shared signal — updates as players drop / the target gets found,
        so spectating reads as an ongoing match rather than a frozen screen. */}
    {typeof playersRemaining === 'number' && playersRemaining > 0 && (
      <span className="text-neo-lime font-neo-display text-sm font-black uppercase tracking-wider">
        {t('wordHunt.mp.stillHunting', { count: playersRemaining })}
      </span>
    )}
  </AdaptiveMotion.div>
);

/** Floating sparkle particles for the victory burst */
/** Simple seeded random for deterministic particles */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    const distance = 100 + seededRandom(i) * 80;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: i * 0.05,
      size: 12 + seededRandom(i + 100) * 8,
    };
  });
}

const VictoryParticles: React.FC<{ count?: number }> = ({ count = 12 }) => {
  const particles = buildParticles(count);

  return (
    <>
      {particles.map((p) => (
        <AdaptiveMotion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0],
            x: p.x,
            y: p.y,
          }}
          transition={{
            duration: 1.2,
            delay: 0.3 + p.delay,
            ease: 'easeOut',
          }}
          className="absolute z-10"
        >
          <Sparkles size={p.size} className="text-yellow-300" />
        </AdaptiveMotion.div>
      ))}
    </>
  );
};
