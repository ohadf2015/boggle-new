'use client';

import { useMemo, useEffect, useState } from 'react';
import { m, animate as fmAnimate } from 'framer-motion';
import { Share2, Flame, Sparkles, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import DailyResultRecap from './DailyResultRecap';
import DailyAnswerKey from './DailyAnswerKey';
import ConnectionsLeaderboard from './ConnectionsLeaderboard';
import ResultsBannerSlot from '@/components/ads/ResultsBannerSlot';

interface ConnectionsDailyResultsProps {
  score: number;
  solvedCount: number;
  total: number;
  streak: number;
  rank: number | null;
  totalPlayers: number;
  outcomes: readonly BridgeOutcome[];
  puzzles: readonly ConnectionPuzzle[];
  leaderboardRows: LeaderboardRow[];
  isLoading: boolean;
  onShare: () => void;
  onBack?: () => void;
}

// Tier calculation based on score
function getTierInfo(score: number, solvedCount: number, total: number): {
  key: string;
  glowColor: string;
  isExceptional: boolean;
} {
  const EXCELLENT_SCORE = 400;
  const EXCELLENT_SOLVE = total;

  if (solvedCount === EXCELLENT_SOLVE && score >= EXCELLENT_SCORE) {
    return {
      key: 'connections.daily.tier.perfect',
      glowColor: 'shadow-[0_0_30px_rgba(191,255,0,0.4)]',
      isExceptional: true,
    };
  }
  if (score >= 300 || solvedCount >= total - 1) {
    return {
      key: 'connections.daily.tier.exceptional',
      glowColor: 'shadow-[0_0_25px_rgba(0,255,255,0.3)]',
      isExceptional: true,
    };
  }
  if (score >= 150 || solvedCount >= Math.ceil(total * 0.6)) {
    return {
      key: 'connections.daily.tier.great',
      glowColor: 'shadow-[0_0_20px_rgba(139,92,246,0.3)]',
      isExceptional: false,
    };
  }
  return {
    key: 'connections.daily.tier.good',
    glowColor: '',
    isExceptional: false,
  };
}

const ConnectionsDailyResults: React.FC<ConnectionsDailyResultsProps> = ({
  score,
  solvedCount,
  total,
  streak,
  rank,
  totalPlayers,
  outcomes,
  puzzles,
  leaderboardRows,
  isLoading,
  onShare,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const { playVictorySound } = useSoundEffects();
  const [animatedScore, setAnimatedScore] = useState(0);

  const blanked = solvedCount === 0;
  const tier = useMemo(() => getTierInfo(score, solvedCount, total), [score, solvedCount, total]);

  // Animate score counting and play sounds
  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedScore(score);
      return;
    }

    playVictorySound();

    const result = fmAnimate(0, score, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setAnimatedScore(Math.round(v)),
      // `animationComplete` is not a framer-motion option — the confetti it
      // guarded never fired. The callback is `onComplete`.
      onComplete: () => {
        if (tier.isExceptional && !prefersReducedMotion) {
          fireVictoryConfetti();
        }
      },
    });

    return () => result?.stop?.();
  }, [score, prefersReducedMotion, tier.isExceptional, playVictorySound]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      {/* Back Button */}
      <div className="flex items-center justify-start mb-2">
        <button
          data-testid="back-button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-neo border-neo border-neo-white/20 bg-neo-navy-light px-2 py-1.5 text-neo-white/70 transition-colors hover:bg-neo-navy hover:text-neo-white active:bg-neo-navy shadow-hard-sm"
          aria-label={t('common.back')}
        >
          <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
        </button>
      </div>

      {/* Title + Progress Number */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="flex flex-col gap-1"
      >
        <h1 className="font-neo-display text-lg font-black text-neo-white">
          {t('connections.daily.title')}
        </h1>
        <p className="font-neo-body text-xs text-neo-white/60">
          {t(blanked ? 'connections.daily.completeTough' : 'connections.daily.complete')}
        </p>
      </m.div>

      {/* Special case: blanked run shows encouragement instead of score */}
      {blanked ? (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          className="mx-auto max-w-[19rem] rounded-neo border-neo border-neo-cyan bg-neo-cyan/10 p-4 text-center"
        >
          <p className="font-neo-body text-sm text-neo-white/75">
            {t('connections.daily.zeroSolved', { total })}
          </p>
        </m.div>
      ) : (
        <>
          {/* Hero Score Circle */}
          <m.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 20,
              delay: 0.1,
            }}
            data-testid="score-circle"
            className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full border-3 border-neo-black bg-neo-navy-light shadow-hard-lg motion-reduce:border-2 ${tier.glowColor}`}
          >
            <span className="font-neo-display text-5xl font-black text-neo-lime">
              {animatedScore}
            </span>
          </m.div>

          {/* Tier Message */}
          <m.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 22,
              delay: 0.25,
            }}
            data-testid="tier-message"
            className="text-center"
          >
            <p className={`font-neo-display text-base font-black uppercase tracking-wider ${
              tier.isExceptional ? 'text-neo-lime' : 'text-neo-cyan'
            }`}>
              {t(tier.key)}
            </p>
          </m.div>

          {/* Stat Chips Row */}
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {/* Solved Count Chip */}
            <m.div
              data-testid="stat-chip-solved"
              className="inline-flex items-center gap-1.5 rounded-neo border-neo border-neo-cyan bg-neo-cyan/10 px-3 py-1 shadow-hard-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="font-neo-display text-sm font-black text-neo-cyan">
                {solvedCount}/{total}
              </span>
              <span className="font-neo-body text-xs text-neo-white/70">
                {t('connections.daily.solved', { count: solvedCount, total })}
              </span>
            </m.div>

            {/* Streak Chip - only if streak > 0 */}
            {streak > 0 && (
              <m.div
                data-testid="stat-chip-streak"
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
                className="inline-flex items-center gap-1 rounded-neo border-neo border-neo-orange bg-neo-orange/10 px-3 py-1 shadow-hard-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Flame className="h-4 w-4 text-neo-orange" strokeWidth={2.5} aria-hidden="true" />
                <span className="font-neo-display font-black text-neo-orange">{streak}</span>
              </m.div>
            )}
          </m.div>

          {/* Perfect/Exceptional Banner */}
          {tier.isExceptional && (
        <m.div
          initial={{ scale: 0.8, y: -8 }}
          animate={{ scale: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 20,
            delay: 0.5,
          }}
          data-testid="exceptional-banner"
          className="flex items-center justify-center gap-2 rounded-neo border-neo-thick border-neo-lime bg-neo-lime/15 px-4 py-2 shadow-hard-lg"
        >
          <Sparkles className="h-5 w-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-neo-display text-sm font-black uppercase text-neo-lime">
            {t('connections.daily.exceptional')}
          </span>
          <Sparkles className="h-5 w-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
        </m.div>
      )}
        </>
      )}

      {/* Recap Grid */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <DailyResultRecap outcomes={outcomes} nextLabel={t('connections.daily.nextIn')} />
      </m.div>

      {/* Answer Key */}
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <DailyAnswerKey
          puzzles={puzzles}
          solvedIndices={new Set(outcomes.map((o, i) => o.solved ? i : -1).filter(i => i !== -1))}
          title={t('connections.daily.answerKey')}
          isRTL={language === 'he'}
        />
      </m.div>

      {/* Share Button */}
      <m.button
        type="button"
        onClick={onShare}
        whileTap={{ scale: 0.96 }}
        className="mx-auto mt-2 inline-flex items-center gap-2 rounded-neo border-neo-thick border-neo-pink bg-neo-pink px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard transition-colors hover:bg-neo-pink/90 active:shadow-hard-pressed"
      >
        <Share2 className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        {t('connections.daily.share')}
      </m.button>

      {/* Ad Banner Slot */}
      <ResultsBannerSlot placement="daily-complete" />

      {/* Leaderboard */}
      <m.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        data-testid="connections-leaderboard"
      >
        <ConnectionsLeaderboard
          rows={leaderboardRows}
          ownRank={rank}
          totalPlayers={totalPlayers}
          streak={streak}
          loading={isLoading}
        />
      </m.div>
    </div>
  );
};

export default ConnectionsDailyResults;
