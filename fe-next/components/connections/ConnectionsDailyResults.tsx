'use client';

import { useMemo, useEffect, useState } from 'react';
import { m, animate as fmAnimate } from 'framer-motion';
import { Flame, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { GameEmojiShareCard } from '@/components/shared/GameEmojiShareCard';
import type { LeaderboardRow } from '@/lib/connections/dailyClient';
import type { BridgeOutcome } from '@/lib/connections/shareGrid';
import type { ConnectionPuzzle } from '@/lib/connections/types';
import BridgeOutcomeTiles from './BridgeOutcomeTiles';
import BridgeCountdown from './BridgeCountdown';
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
  /** Paste-text share path (buildDailyBridgeGrid) — copied/shared by the card. */
  shareText: string;
  /** UTC day of this daily set (e.g. '2026-09-13') — shown in the card header. */
  dateISO: string;
  /** Telemetry hook for the card's share/copy buttons. */
  onShareClick?: (method: 'native' | 'copy') => void;
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

/** Labeled stat tile — same visual language as the shared ShareRecapCard stats. */
const TILE =
  'flex flex-col items-center rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 shadow-hard-sm';
const TILE_VALUE = 'font-neo-display text-lg font-black leading-none tabular-nums';
const TILE_LABEL = 'mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400';

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
  shareText,
  dateISO,
  onShareClick,
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
      {/* Back to daily landing — same pattern as the wheel/hunt results pages. */}
      <div className="flex items-center justify-start mb-2">
        <Link
          data-testid="back-button"
          href={`/${language}/daily`}
          className="flex items-center gap-1 rounded-neo border-neo border-neo-white/20 bg-neo-navy-light px-2 py-1.5 text-neo-white/70 transition-colors hover:bg-neo-navy hover:text-neo-white shadow-hard-sm"
          aria-label={t('common.back')}
        >
          <DirectionalIcon icon={ArrowLeft} className="h-4 w-4" />
        </Link>
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

          {/* Labeled stat tiles — value over label, the same shape the shared
              share card uses for its stats grid. */}
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center gap-2"
          >
            <m.div
              data-testid="stat-chip-solved"
              className={TILE}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className={`${TILE_VALUE} text-neo-cyan`}>
                {solvedCount}/{total}
              </span>
              <span className={TILE_LABEL}>
                {t('connections.daily.solvedLabel')}
              </span>
            </m.div>

            {streak > 0 && (
              <m.div
                data-testid="stat-chip-streak"
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.4 }}
                className={TILE}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={`${TILE_VALUE} inline-flex items-center gap-1 text-neo-orange`}>
                  <Flame className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                  {streak}
                </span>
                <span className={TILE_LABEL}>{t('connections.streak')}</span>
              </m.div>
            )}

            {rank != null && (
              <m.div
                data-testid="stat-tile-rank"
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.45 }}
                className={TILE}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className={`${TILE_VALUE} text-neo-lime`}>#{rank}</span>
                <span className={TILE_LABEL}>{t('share.emojiCard.rank')}</span>
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

      {/* The shareable artifact — reuses the shared share card the wheel and
          singleplayer results already ship (GameEmojiShareCard over
          ShareRecapCard), with the bridge outcome tiles as the recap content.
          Hidden on a blanked run: nobody posts an empty grid. The paste text
          keeps its own emoji-callout path (shareText) — the card itself stays
          emoji-free. */}
      {!blanked && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full"
        >
          <GameEmojiShareCard
            data={{
              mode: 'connections',
              dateISO,
              score,
              solved: solvedCount,
              total,
              streak,
              rank,
            }}
            t={t}
            language={language}
            shareText={shareText}
            onShareClick={onShareClick}
            extra={<BridgeOutcomeTiles outcomes={outcomes} />}
          />
          <div className="mt-2 text-center">
            <BridgeCountdown nextLabel={t('connections.daily.nextIn')} />
          </div>
        </m.div>
      )}
      {blanked && (
        <div className="text-center">
          <BridgeCountdown nextLabel={t('connections.daily.nextIn')} />
        </div>
      )}

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
