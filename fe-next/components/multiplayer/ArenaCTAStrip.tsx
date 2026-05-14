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
      className="flex flex-col sm:flex-row min-[720px]:flex-col gap-2.5"
    >
      <m.button
        type="button"
        onClick={onQuickPlay}
        disabled={isQuickPlayLoading}
        aria-label={t('multiplayerFlow.roomList.quickStart')}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-2 min-h-[52px] py-3 px-4 flex items-center justify-center gap-2.5 bg-neo-lime border-3 border-neo-black rounded-xl shadow-hard active:translate-y-0.5 active:shadow-hard-pressed transition-all disabled:opacity-70 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        {isQuickPlayLoading ? (
          <Loader size="sm" />
        ) : (
          <Zap className="w-5 h-5 text-neo-black shrink-0" />
        )}
        <span className="text-neo-black font-black text-base sm:text-lg uppercase tracking-tight">
          {t('multiplayerFlow.roomList.quickStart')}
        </span>
      </m.button>

      <m.button
        type="button"
        onClick={onCreateRoom}
        aria-label={t('multiplayerFlow.roomList.createPrivateBattle')}
        whileHover={{ scale: 1.02, transition: { type: 'spring' as const, stiffness: 400, damping: 20 } }}
        whileTap={{ scale: 0.97 }}
        className="flex-1 min-h-[48px] py-3 px-4 flex items-center justify-center gap-2 bg-neo-navy-light border-3 border-neo-pink/60 rounded-xl shadow-hard-sm hover:border-neo-pink active:translate-y-0.5 active:shadow-hard-pressed transition-all focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime"
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
