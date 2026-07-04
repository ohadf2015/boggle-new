'use client';

import React from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Zap, Calendar } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 250, damping: 20, delay: 0.2 },
  },
};

interface ArenaEmptyStateProps {
  onQuickPlay?: () => void;
  isQuickPlayLoading?: boolean;
}

/**
 * Shown when no multiplayer rooms exist. Replaced the dead-end messaging
 * ("No battles in progress / Be the legend...") with action CTAs:
 * - Primary: Quick Play (auto-fill with bots)
 * - Secondary: Daily Challenge (time-based single-player)
 */
const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({
  onQuickPlay,
  isQuickPlayLoading = false,
}) => {
  const { t, language } = useLanguage();

  return (
    <m.div
      data-testid="arena-empty-state"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center gap-4 px-5 py-6 short:py-3 medium-short:py-4"
    >
      <m.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
        className="shrink-0"
      >
        <Image
          src="/mascot/spectating.webp"
          alt=""
          width={112}
          height={112}
          className="w-24 h-24 sm:w-28 sm:h-28 short:w-16 short:h-16 object-contain"
        />
      </m.div>
      <div className="max-w-xs">
        <h3 className="font-neo-display text-neo-white font-black text-lg sm:text-xl uppercase tracking-tight leading-tight">
          {t('mp.noRoomsYet')}
        </h3>
        <p className="text-white text-sm mt-1.5 font-bold leading-snug">
          {t('mp.emptyStateCaption')}
        </p>
      </div>

      {/* Action CTAs */}
      <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
        {onQuickPlay && (
          <m.button
            type="button"
            onClick={onQuickPlay}
            disabled={isQuickPlayLoading}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'flex items-center justify-center gap-2',
              'px-4 py-2.5 rounded-neo border-2 border-neo-black',
              'font-neo-display font-black text-sm uppercase tracking-tight',
              'transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
              isQuickPlayLoading
                ? 'bg-neo-lime/60 text-neo-black opacity-75'
                : 'bg-neo-lime text-neo-black shadow-hard hover:bg-neo-lime/90 active:translate-y-0.5 active:shadow-none'
            )}
          >
            <Zap className="w-4 h-4" />
            {isQuickPlayLoading ? t('common.starting') : t('mp.quickPlayAction')}
          </m.button>
        )}

        <Link
          href={`/${language}/daily`}
          className={cn(
            'flex items-center justify-center gap-2',
            'px-4 py-2.5 rounded-neo border-2 border-neo-black',
            'font-neo-display font-black text-sm uppercase tracking-tight',
            'bg-neo-cyan/20 text-neo-cyan shadow-hard-sm',
            'hover:bg-neo-cyan/30 active:translate-y-0.5 active:shadow-none',
            'transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime'
          )}
        >
          <Calendar className="w-4 h-4" />
          {t('mp.dailyChallengeAction')}
        </Link>
      </div>
    </m.div>
  );
};

export default ArenaEmptyState;
