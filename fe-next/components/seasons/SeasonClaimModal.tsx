'use client';

import React, { useEffect, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion, useMotionValue, useSpring, animate, type Transition } from 'framer-motion';
import Image from 'next/image';
import { Crown, Target, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SeasonRewardsResult } from '@/lib/seasons';
import { tierColor } from '@/lib/tierColors';
import { getRankBadge, isTopFiveRank } from '@/lib/seasonBadges';

// Snappy counter ticker (animate-ai pattern: text-counter-ticker, spring 200/30).
// Inline so we don't carry a 4th file just for two numbers.
const CounterTicker: React.FC<{ value: number; duration?: number; className?: string }> = ({
  value,
  duration = 1.2,
  className = '',
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 200, damping: 30 });

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = value.toLocaleString();
      return;
    }
    const controls = animate(motionValue, value, { duration });
    return controls.stop;
  }, [value, duration, motionValue, reduce]);

  useEffect(() => {
    return spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
    });
  }, [spring]);

  return <span ref={ref} className={`tabular-nums ${className}`}>0</span>;
};

// Per-character entrance — splits a string into chars and pops each in sequence.
const SplitChars: React.FC<{ text: string; className?: string; delay?: number }> = ({
  text,
  className = '',
  delay = 0,
}) => {
  const reduce = useReducedMotion();
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={className} aria-label={text}>
      {Array.from(text).map((ch, i) => (
        <m.span
          key={`${ch}-${i}`}
          aria-hidden="true"
          className="inline-block"
          initial={{ y: '60%', opacity: 0, rotate: -8, scale: 0.6 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          transition={{
            delay: delay + i * 0.035,
            type: 'spring',
            stiffness: 360,
            damping: 14,
          }}
        >
          {ch === ' ' ? ' ' : ch}
        </m.span>
      ))}
    </span>
  );
};

// Stat tile — icon + label + value with staggered spring entrance and idle wobble.
const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
  index: number;
  reduce: boolean;
}> = ({ icon, label, value, accent, index, reduce }) => {
  const transition: Transition = reduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 320, damping: 18, delay: 0.55 + index * 0.08 };
  const idleWobble: Transition = { duration: 5 + index, repeat: Infinity, ease: 'easeInOut' };
  return (
    <m.div
      className="relative bg-neo-navy-light border-neo-thick border-black rounded-neo p-3 text-center shadow-hard-sm overflow-hidden"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.7, rotate: -4 }}
      animate={
        reduce
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1, rotate: index % 2 === 0 ? [-1, 1, -1] : [1, -1, 1] }
      }
      transition={reduce ? transition : { ...transition, rotate: idleWobble }}
      whileHover={reduce ? undefined : { scale: 1.05, rotate: 0, y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
    >
      <div className="flex items-center justify-center mb-1" aria-hidden="true">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-neo border-neo border-black shadow-hard-sm ${accent}`}
        >
          {icon}
        </span>
      </div>
      <p className="text-[10px] text-neo-white uppercase tracking-widest font-bold">{label}</p>
      <p className="font-neo-display font-black text-xl text-neo-white leading-none mt-1">{value}</p>
    </m.div>
  );
};

const TIER_MEDAL: Record<string, string> = {
  Bronze:      '/seasons/medals/medal-bronze.png',
  Silver:      '/seasons/medals/medal-silver.png',
  Gold:        '/seasons/medals/medal-gold.png',
  Platinum:    '/seasons/medals/medal-platinum.png',
  Diamond:     '/seasons/medals/medal-diamond.png',
  Master:      '/seasons/medals/medal-master.png',
  Grandmaster: '/seasons/medals/medal-grandmaster.png',
};

function medalForTier(tier: string): string {
  return TIER_MEDAL[tier] ?? TIER_MEDAL.Bronze;
}

export interface SeasonRecapStats {
  totalScore: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface SeasonClaimModalProps {
  seasonId: number;
  seasonName: string;
  tier: string;
  rankPosition?: number;
  rewards: SeasonRewardsResult;
  isClaiming: boolean;
  isClaimed: boolean;
  recap?: SeasonRecapStats | null;
  claimError?: string | null;
  onClaim: () => void;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFE135', '#FF6B35'];

// Deterministic full-bleed confetti rain — SSR/CSR stable.
const CONFETTI = Array.from({ length: 48 }, (_, i) => ({
  left: ((i * 37) % 100),
  top: ((i * 61) % 100),
  size: 5 + ((i * 11) % 9),
  delay: ((i * 19) % 100) / 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  rotate: (i * 29) % 360,
  duration: 3 + (i % 4),
}));

export const SeasonClaimModal: React.FC<SeasonClaimModalProps> = ({
  seasonId,
  seasonName,
  tier,
  rankPosition,
  rewards,
  isClaiming,
  isClaimed,
  recap,
  claimError,
  onClaim,
  onClose,
}) => {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const color = tierColor(tier);
  const dialogRef = useRef<HTMLDivElement>(null);
  const placementBadge = isTopFiveRank(rankPosition)
    ? getRankBadge(seasonId, rankPosition as number)
    : null;
  const heroImage = placementBadge ? placementBadge.imagePath : medalForTier(tier);
  const heroAlt = placementBadge
    ? t(placementBadge.titleKey)
    : `${tier} season medal`;

  // Escape key + initial focus for keyboard a11y
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stagger = (delay: number) =>
    reduceMotion
      ? { duration: 0 }
      : { delay, type: 'spring' as const, stiffness: 280, damping: 18 };

  return (
    <AnimatePresence>
      <m.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 texture-halftone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="season-claim-modal"
        data-season-id={seasonId}
      >
        {/* Full-screen confetti rain — overlays backdrop, sits beneath modal card */}
        {!reduceMotion && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {CONFETTI.map((c, i) => (
              <m.span
                key={i}
                className="absolute block"
                style={{
                  left: `${c.left}%`,
                  top: `${c.top}%`,
                  width: c.size,
                  height: c.size,
                  backgroundColor: c.color,
                  borderRadius: i % 3 === 0 ? '50%' : '2px',
                  boxShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                }}
                initial={{ y: -40, opacity: 0, rotate: 0 }}
                animate={{
                  y: ['-10vh', '110vh'],
                  opacity: [0, 1, 1, 0.6, 0],
                  rotate: [0, c.rotate, c.rotate * 2],
                }}
                transition={{
                  duration: c.duration,
                  delay: c.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </div>
        )}
        <m.div
          ref={dialogRef}
          tabIndex={-1}
          className={`
            relative w-full max-w-md bg-neo-navy border-neo-thick border-black
            rounded-neo shadow-hard-lg p-6 flex flex-col gap-4 outline-none
            border-l-8 ${color.border}
            max-h-[92vh] overflow-y-auto overflow-x-hidden
          `}
          initial={reduceMotion ? false : { scale: 0.85, y: 32 }}
          animate={{ scale: 1, y: 0 }}
          exit={reduceMotion
            ? { opacity: 0 }
            : { scale: [1, 1.05, 0.9], opacity: [1, 1, 0], transition: { duration: 0.35 } }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="season-claim-title"
        >
          <div className="text-center flex flex-col items-center gap-2">
            <div className="relative">
              <m.div
                initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={reduceMotion
                  ? undefined
                  : { rotate: [-2, 2, -2], transition: { duration: 0.6, repeat: Infinity } }}
                transition={stagger(0.2)}
                className="drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-default"
              >
                <Image
                  src={heroImage}
                  alt={heroAlt}
                  width={placementBadge ? 200 : 176}
                  height={placementBadge ? 200 : 176}
                  priority
                  data-testid={placementBadge ? 'season-placement-badge' : 'season-medal'}
                  data-rank={placementBadge?.rank}
                />
              </m.div>
              {!reduceMotion && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const angle = (i * Math.PI) / 4;
                    const radius = 100;
                    return (
                      <m.span
                        key={i}
                        className="absolute w-2 h-2 bg-neo-yellow border-2 border-black rounded-sm"
                        initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                        animate={{
                          x: Math.cos(angle) * radius,
                          y: Math.sin(angle) * radius,
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0.6],
                          rotate: 360,
                        }}
                        transition={{ delay: 0.55 + i * 0.03, duration: 0.7, ease: 'easeOut' }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <m.h2
              id="season-claim-title"
              className="font-neo-display font-black text-2xl text-neo-lime tracking-tight"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(0.35)}
            >
              {seasonName}
            </m.h2>
            <h3 className="font-neo-display font-black text-2xl text-neo-pink uppercase tracking-tight">
              <SplitChars
                text={
                  placementBadge
                    ? t('seasonBadges.modal.headline', { rank: placementBadge.rank })
                    : t('season.complete')
                }
                delay={0.42}
              />
            </h3>
          </div>

          {/*
            Three icon-led stat tiles — Peak Tier, Games, Final Score.
            "Best Rank" tile dropped: it duplicates the SplitChars headline ("YOU FINISHED #N!").
            Each tile: snappy spring entry, idle wobble, hover lift.
          */}
          <div className={`grid ${recap ? 'grid-cols-3' : 'grid-cols-1'} gap-2 text-sm`}>
            <StatTile
              index={0}
              reduce={!!reduceMotion}
              icon={<Crown className="w-4 h-4 text-black" aria-hidden="true" />}
              accent="bg-neo-yellow"
              label={t('seasonBadges.recap.peakTier')}
              value={<span className={color.text}>{tier}</span>}
            />
            {recap && (
              <>
                <StatTile
                  index={1}
                  reduce={!!reduceMotion}
                  icon={<Swords className="w-4 h-4 text-black" aria-hidden="true" />}
                  accent="bg-neo-pink"
                  label={t('seasonBadges.recap.totalGames')}
                  value={<CounterTicker value={recap.gamesPlayed} />}
                />
                <StatTile
                  index={2}
                  reduce={!!reduceMotion}
                  icon={<Target className="w-4 h-4 text-black" aria-hidden="true" />}
                  accent="bg-neo-lime"
                  label={t('seasonBadges.recap.finalScore')}
                  value={<CounterTicker value={recap.totalScore} duration={1.6} />}
                />
              </>
            )}
          </div>

          {rewards.badges.length > 0 && (
            <m.div
              className="flex flex-wrap gap-2 justify-center"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(0.6)}
            >
              {rewards.badges.map((badge) => (
                <span
                  key={badge.id}
                  className="px-2 py-1 bg-neo-pink text-black border-neo border-black rounded-neo text-xs font-neo-display shadow-hard-sm"
                >
                  {badge.name}
                </span>
              ))}
            </m.div>
          )}

          <m.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(0.68)}
          >
            {isClaimed ? (
              <>
                <p className="text-center text-neo-lime font-neo-body mb-3">
                  {t('season.rewardEarned', { coins: rewards.coins })}
                </p>
                <button
                  onClick={onClose}
                  className="
                    w-full py-3 bg-neo-cyan text-black font-neo-display
                    border-neo border-black rounded-neo shadow-hard-sm
                    hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                    transition-all
                  "
                >
                  {t('season.continue')}
                </button>
              </>
            ) : (
              <>
              {claimError && (
                <p
                  role="alert"
                  className="text-center text-xs text-neo-red font-neo-body mb-2"
                  data-testid="season-claim-error"
                >
                  {claimError}
                </p>
              )}
              <div className="relative">
                {/* Pulsing halo — draws the eye to the primary action without blocking pointer */}
                {!reduceMotion && !isClaiming && (
                  <m.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-neo bg-neo-lime"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.18, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
                <m.button
                  onClick={onClaim}
                  disabled={isClaiming}
                  whileHover={reduceMotion ? undefined : { scale: 1.02, y: -1 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.96, y: 1 }}
                  className="
                    relative w-full py-3 bg-neo-lime text-black font-neo-display font-black uppercase tracking-wider
                    border-neo-thick border-black rounded-neo shadow-hard
                    hover:shadow-hard-lg active:shadow-hard-pressed
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                    disabled:opacity-60 disabled:cursor-not-allowed
                  "
                  aria-label={t('season.claimRewards')}
                >
                  {t('season.claimRewards')}
                </m.button>
              </div>
              </>
            )}
          </m.div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
};
