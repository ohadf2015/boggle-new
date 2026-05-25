'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Zap, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';

const stripVariants = {
  hidden: { y: -15, opacity: 0, scale: 0.95 },
  visible: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 22, delay: 0.1 },
  },
};

interface ArenaCTAStripProps {
  onQuickPlay: () => void;
  onCreateRoom: () => void;
  isQuickPlayLoading?: boolean;
  /** Skips entrance animation when the parent already mounted (prevents re-entrance on prop churn). */
  skipEnterAnimation?: boolean;
}

const ArenaCTAStrip: React.FC<ArenaCTAStripProps> = ({
  onQuickPlay,
  onCreateRoom,
  isQuickPlayLoading = false,
  skipEnterAnimation = false,
}) => {
  const { t } = useLanguage();

  return (
    <m.section
      data-testid="arena-cta-strip"
      variants={stripVariants}
      initial={skipEnterAnimation ? false : 'hidden'}
      animate="visible"
      className="flex flex-col sm:flex-row gap-2.5"
    >
      {/* Primary action — instant matchmaking. Bumped to the clear hero:
          larger min-height, an icon chip for weight, and a lift-on-hover so it
          reads as the obvious first move. */}
      <m.button
        type="button"
        onClick={onQuickPlay}
        disabled={isQuickPlayLoading}
        aria-label={t('multiplayerFlow.roomList.quickStart')}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-2 min-h-[56px] py-3 px-4 flex items-center justify-center gap-3 bg-neo-lime border-3 border-neo-black rounded-xl shadow-hard hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-70 disabled:cursor-wait focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-neo-black/15 border-2 border-neo-black/25 shrink-0">
          {isQuickPlayLoading ? (
            <Loader size="sm" />
          ) : (
            <Zap className="w-5 h-5 text-neo-black" />
          )}
        </span>
        <span className="text-neo-black font-black text-lg sm:text-xl uppercase tracking-tight">
          {t('multiplayerFlow.roomList.quickStart')}
        </span>
      </m.button>

      {/* Secondary action — create a private room. Visibly subordinate:
          dark fill, pink outline that warms on hover. */}
      <m.button
        type="button"
        onClick={onCreateRoom}
        aria-label={t('multiplayerFlow.roomList.createPrivateBattle')}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-1 min-h-[48px] py-3 px-4 flex items-center justify-center gap-2 bg-neo-navy-light border-3 border-neo-pink/50 rounded-xl shadow-hard-sm hover:border-neo-pink hover:bg-neo-navy-light/70 active:translate-y-0.5 active:shadow-hard-pressed transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
      >
        <Users className="w-4 h-4 text-neo-pink shrink-0" />
        <span className="text-neo-pink font-black text-sm uppercase tracking-wide whitespace-nowrap">
          {t('multiplayerFlow.roomList.createPrivateBattle')}
        </span>
      </m.button>
    </m.section>
  );
};

export default ArenaCTAStrip;
