'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { calculateSoftReset } from '@/lib/seasons';

export interface SeasonEndSummaryProps {
  seasonName: string;
  seasonId: number;
  gamesPlayed: number;
  peakTier: string;
  finalElo: number;
  coinsAwarded: number;
  badgesUnlocked: string[];
  onDismiss: () => void;
}

export const SeasonEndSummary: React.FC<SeasonEndSummaryProps> = ({
  seasonName,
  seasonId,
  gamesPlayed,
  peakTier,
  finalElo,
  coinsAwarded,
  badgesUnlocked,
  onDismiss,
}) => {
  const { t } = useLanguage();
  const resetElo = calculateSoftReset(finalElo);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-testid="season-end-summary"
      >
        <motion.div
          className="
            w-full max-w-md bg-neo-navy border-neo-thick border-black
            rounded-neo shadow-hard-lg p-6 flex flex-col gap-4
          "
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 14 }}
            >
              <Image
                src="/mascot/trophy.gif"
                alt=""
                width={80}
                height={80}
                className="mx-auto mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]"
                unoptimized
                aria-hidden="true"
              />
            </motion.div>
            <h2 className="font-neo-display text-2xl text-neo-lime">
              {seasonName}
            </h2>
            <p className="font-neo-display text-lg text-neo-pink mt-1">
              {t('season.complete')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-neo-navy-light border-neo border-black rounded-neo p-3 text-center">
              <p className="text-neo-cream/60 text-xs">{t('season.gamesPlayed') || 'Games'}</p>
              <p className="font-neo-display text-neo-cream text-lg">{gamesPlayed}</p>
            </div>
            <div className="bg-neo-navy-light border-neo border-black rounded-neo p-3 text-center">
              <p className="text-neo-cream/60 text-xs">
                {t('season.peakTier', { tier: '' }).replace(': ', '')}
              </p>
              <p className="font-neo-display text-neo-cream text-lg">{peakTier}</p>
            </div>
          </div>

          <div className="bg-neo-navy-light border-neo border-black rounded-neo p-3 text-center">
            <p className="text-neo-cream/60 text-xs">
              {t('season.softReset', { old: finalElo, new: resetElo })}
            </p>
          </div>

          {coinsAwarded > 0 && (
            <div className="text-center text-neo-lime font-neo-body">
              {t('season.rewardCoins', { coins: coinsAwarded })}
            </div>
          )}

          {badgesUnlocked.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {badgesUnlocked.map((badge) => (
                <span
                  key={badge}
                  className="px-2 py-1 bg-neo-pink/20 border-neo border-neo-pink rounded-neo text-xs text-neo-cream"
                >
                  {badge}
                </span>
              ))}
            </div>
          )}

          <div className="text-center text-neo-cyan text-sm font-neo-body">
            {t('season.newSeason', { number: seasonId + 1 })}
          </div>

          <button
            onClick={onDismiss}
            className="
              w-full py-3 bg-neo-lime text-black font-neo-display
              border-neo border-black rounded-neo shadow-hard-sm
              hover:shadow-hard-pressed active:translate-y-0.5
              transition-all
            "
          >
            {t('season.continue') || 'Continue'}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
