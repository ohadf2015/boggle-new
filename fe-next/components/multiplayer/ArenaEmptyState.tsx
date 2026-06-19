'use client';

import React from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

const containerVariants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 250, damping: 20, delay: 0.2 },
  },
};

/**
 * Shown in the right pane when no rooms exist. Deliberately minimal — a single
 * "spectating" mascot watching an empty arena + a one-line invitation. The
 * action (Quick Start) is owned by ArenaCTAStrip, so this state stays pure
 * messaging: no duplicate CTA, no mode-teaser chips, no decorative blobs.
 */
const ArenaEmptyState: React.FC = () => {
  const { t } = useLanguage();

  return (
    <m.div
      data-testid="arena-empty-state"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center text-center gap-3 px-5 py-6 short:py-3 medium-short:py-4"
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
          {t('multiplayerFlow.roomList.noRoomsYet')}
        </h3>
        <p className="text-white text-sm mt-1.5 font-bold leading-snug">
          {t('multiplayerFlow.roomList.beTheLegend')}
        </p>
      </div>
    </m.div>
  );
};

export default ArenaEmptyState;
