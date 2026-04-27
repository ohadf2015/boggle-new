'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SeasonRewardsResult } from '@/lib/seasons';
import { tierColor } from '@/lib/tierColors';

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

export interface SeasonClaimModalProps {
  seasonId: number;
  seasonName: string;
  tier: string;
  rankPosition?: number;
  rewards: SeasonRewardsResult;
  isClaiming: boolean;
  isClaimed: boolean;
  onClaim: () => void;
  onClose: () => void;
}

export const SeasonClaimModal: React.FC<SeasonClaimModalProps> = ({
  seasonId,
  seasonName,
  tier,
  rankPosition,
  rewards,
  isClaiming,
  isClaimed,
  onClaim,
  onClose,
}) => {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const color = tierColor(tier);
  const dialogRef = useRef<HTMLDivElement>(null);

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
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 texture-halftone"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="season-claim-modal"
        data-season-id={seasonId}
      >
        <motion.div
          ref={dialogRef}
          tabIndex={-1}
          className={`
            relative w-full max-w-md bg-neo-navy border-neo-thick border-black
            rounded-neo shadow-hard-lg p-6 flex flex-col gap-4 outline-none
            border-l-8 ${color.border}
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
              <motion.div
                initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                whileHover={reduceMotion
                  ? undefined
                  : { rotate: [-2, 2, -2], transition: { duration: 0.6, repeat: Infinity } }}
                transition={stagger(0.2)}
                className="drop-shadow-[3px_3px_0px_rgba(0,0,0,1)] cursor-default"
              >
                <Image
                  src={medalForTier(tier)}
                  alt={`${tier} season medal`}
                  width={176}
                  height={176}
                  priority
                  data-testid="season-medal"
                />
              </motion.div>
              {!reduceMotion && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                    const angle = (i * Math.PI) / 4;
                    const radius = 100;
                    return (
                      <motion.span
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
            <motion.h2
              id="season-claim-title"
              className="font-neo-display text-2xl text-neo-lime"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(0.35)}
            >
              {seasonName}
            </motion.h2>
            <motion.p
              className="font-neo-display text-lg text-neo-pink"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(0.42)}
            >
              {t('season.complete')}
            </motion.p>
          </div>

          <motion.div
            className="grid grid-cols-2 gap-3 text-sm"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(0.5)}
          >
            <div className="bg-neo-navy-light border-neo border-black rounded-neo p-3 text-center">
              <p className="text-neo-cream/60 text-xs">{t('season.tierLabel')}</p>
              <p className={`font-neo-display text-lg ${color.text}`}>{tier}</p>
            </div>
            <div className="bg-neo-navy-light border-neo border-black rounded-neo p-3 text-center">
              <p className="text-neo-cream/60 text-xs">
                {rankPosition ? t('season.rankedAt', { position: '' }).replace('#', '#').trim() : '—'}
              </p>
              <p className="font-neo-display text-neo-cream text-lg">
                {rankPosition ? `#${rankPosition}` : '—'}
              </p>
            </div>
          </motion.div>

          {rewards.badges.length > 0 && (
            <motion.div
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
            </motion.div>
          )}

          <motion.div
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
              <button
                onClick={onClaim}
                disabled={isClaiming}
                className="
                  w-full py-3 bg-neo-lime text-black font-neo-display
                  border-neo border-black rounded-neo shadow-hard-sm
                  hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink
                  transition-all disabled:opacity-60 disabled:cursor-not-allowed
                "
                aria-label={t('season.claimRewards')}
              >
                {t('season.claimRewards')}
              </button>
            )}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
