'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { RankTier } from '@/shared/utils/eloRating';
import { SilentVideo } from '@/components/ui/SilentVideo';

interface RankUpCinematicProps {
  from: RankTier;
  to: RankTier;
  onDismiss: () => void;
}

const TIER_BG_COLORS: Record<string, string> = {
  Bronze: 'from-amber-900/90 to-amber-700/90',
  Silver: 'from-gray-600/90 to-gray-400/90',
  Gold: 'from-yellow-700/90 to-yellow-500/90',
  Platinum: 'from-cyan-800/90 to-cyan-500/90',
  Diamond: 'from-blue-800/90 to-blue-500/90',
  Master: 'from-purple-800/90 to-purple-500/90',
  Grandmaster: 'from-red-800/90 to-pink-500/90',
};

export function RankUpCinematic({ from, to, onDismiss }: RankUpCinematicProps) {
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgGradient = TIER_BG_COLORS[to.name] || 'from-gray-800/90 to-gray-600/90';

  return (
    <AnimatePresence>
      <motion.div
        data-testid="rank-up-cinematic"
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-linear-to-b ${bgGradient} cursor-pointer`}
        onClick={onDismiss}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Confetti particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => {
            const seed = (i * 7 + 3) % 20;
            const leftPct = (seed * 5) % 100;
            const xOffset = ((seed * 13) % 200) - 100;
            const direction = seed % 2 === 0 ? 1 : -1;
            const dur = 2 + (seed % 4) * 0.5;
            const del = (seed % 6) * 0.25;
            return (
              <motion.div
                key={`confetti-${i}`}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  backgroundColor: i % 2 === 0 ? to.color : from.color,
                  left: `${leftPct}%`,
                  top: `-5%`,
                }}
                animate={{
                  y: ['0vh', '110vh'],
                  x: [0, xOffset],
                  rotate: [0, 360 * direction],
                }}
                transition={{
                  duration: dur,
                  delay: del,
                  ease: 'easeIn',
                }}
              />
            );
          })}
        </div>

        {/* Tier badge */}
        <motion.div
          className="w-24 h-24 rounded-full border-4 border-white/50 flex items-center justify-center mb-6"
          style={{ backgroundColor: to.color }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.6, times: [0, 0.7, 1] }}
        >
          <span className="text-4xl font-bold text-black/80">
            {to.name.charAt(0)}
          </span>
        </motion.div>

        {/* Rank up header */}
        <motion.h1
          className="text-5xl font-neo-display font-bold text-white mb-4 drop-shadow-lg"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {t('multiplayer.rankUp')}
        </motion.h1>

        {/* Tier name */}
        <motion.h2
          className="text-3xl font-neo-display font-semibold drop-shadow-md"
          style={{ color: to.color }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t('multiplayer.welcomeToTier', { tier: to.name })}
        </motion.h2>

        {/* Celebration mascot */}
        <motion.div
          className="mt-6"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.7, type: 'spring', stiffness: 200, damping: 12 }}
        >
          <SilentVideo
            src="/mascot/celebration.webp"
            width={120}
            height={120}
            className="drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]"
            preload="metadata"
            aria-hidden="true"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
