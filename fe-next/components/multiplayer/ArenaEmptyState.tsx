'use client';

import React from 'react';
import { m } from 'framer-motion';
import Image from 'next/image';
import { Zap, Sword, Bomb, Search, CircleDot } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';

const MODE_TEASERS = [
  { icon: Sword, color: 'text-neo-cyan', labelKey: 'multiplayerFlow.roomList.gameModes.classic' },
  { icon: Bomb, color: 'text-neo-pink', labelKey: 'multiplayerFlow.roomList.gameModes.blast' },
  { icon: Search, color: 'text-neo-purple', labelKey: 'multiplayerFlow.roomList.gameModes.wordHunt' },
  { icon: CircleDot, color: 'text-neo-lime', labelKey: 'multiplayerFlow.roomList.gameModes.wheelRush' },
] as const;

const containerVariants = {
  hidden: { opacity: 0, scale: 0.9 },
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

const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({
  onQuickPlay,
  isQuickPlayLoading = false,
}) => {
  const { t } = useLanguage();

  return (
    <m.div
      data-testid="arena-empty-state"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative bg-neo-navy-light/40 border-2 border-dashed border-neo-lime/30 rounded-2xl p-5 sm:p-6 overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute -top-10 -start-10 w-44 h-44 rounded-full bg-neo-lime/10 blur-2xl pointer-events-none"
      />
      <div className="relative flex items-start gap-4">
        <m.div
          animate={{ y: [0, -6, 0], rotate: [-2, 2, -2] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' as const }}
          className="shrink-0"
        >
          <Image
            src="/mascot/flexing.webp"
            alt=""
            width={72}
            height={72}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
          />
        </m.div>
        <div className="flex-1 min-w-0">
          <h3 className="font-neo-display text-neo-white font-black text-base sm:text-lg uppercase tracking-tight leading-tight">
            {t('multiplayerFlow.roomList.noRoomsYet')}
          </h3>
          <p className="text-white/60 text-xs sm:text-sm mt-1 font-bold">
            {t('multiplayerFlow.roomList.beTheLegend')}
          </p>
          {onQuickPlay && (
            <m.button
              onClick={onQuickPlay}
              disabled={isQuickPlayLoading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-label={t('multiplayerFlow.roomList.quickStart')}
              className="mt-3 inline-flex items-center gap-2 py-2 px-3.5 bg-neo-lime border-2 border-neo-black rounded-lg shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed active:translate-y-0.5 transition-all disabled:opacity-70 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              {isQuickPlayLoading ? (
                <Loader size="sm" />
              ) : (
                <Zap className="w-4 h-4 text-neo-black" />
              )}
              <span className="text-neo-black font-black text-xs uppercase tracking-wide">
                {t('multiplayerFlow.roomList.quickStart')}
              </span>
            </m.button>
          )}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
        {MODE_TEASERS.map(({ icon: Icon, color, labelKey }) => (
          <span
            key={labelKey}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide border bg-neo-navy/40',
              color,
              'border-current/30',
            )}
          >
            <Icon className="w-2.5 h-2.5" />
            {t(labelKey)}
          </span>
        ))}
      </div>
    </m.div>
  );
};

export default ArenaEmptyState;
