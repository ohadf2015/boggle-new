'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { IdleMascotWithEntrance } from '@/components/ui/IdleMascot';
import { LandingLeaderboardPreview } from './LandingLeaderboardPreview';
import type { TopPlayer } from '@/hooks/useTopPlayers';

interface LandingHeroProps {
  players: TopPlayer[];
  playersLoading: boolean;
  isMobilePortrait: boolean;
  onPlayClick: () => void;
}

const HeroMascot = memo(function HeroMascot({ isMobilePortrait }: { isMobilePortrait: boolean }) {
  return (
    <IdleMascotWithEntrance
      baseVariant="happy"
      size="xl"
      sizeClassName={isMobilePortrait ? 'w-16 h-16' : 'w-28 h-28 lg:w-40 lg:h-40'}
      enableHover={!isMobilePortrait}
      enableClick
      hoverVariant="excited"
      clickVariant="celebrating"
      clickAnimation="bounce"
      priority
      fetchPriority="high"
      delay={0.1}
    />
  );
});

export function LandingHero({ players, playersLoading, isMobilePortrait, onPlayClick }: LandingHeroProps) {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'w-full max-w-5xl mx-auto',
      isMobilePortrait ? 'px-2' : 'px-4 lg:px-6'
    )}>
      <div className={cn(
        'flex items-start gap-6 lg:gap-10',
        isMobilePortrait && 'flex-col items-center'
      )}>
        {/* Left: Mascot + Title + CTA */}
        <div className={cn(
          'flex flex-col items-center text-center',
          !isMobilePortrait && 'lg:items-start lg:text-start flex-1'
        )}>
          {/* Mobile: mascot + title inline for compact layout */}
          {isMobilePortrait ? (
            <div className="flex items-center gap-3 mb-2">
              <HeroMascot isMobilePortrait={isMobilePortrait} />
              <motion.h1
                className="font-black uppercase tracking-tight text-neo-black dark:text-neo-white text-xl"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="sr-only">LexiClash — </span>
                {t('landing.welcomeTitle')}
              </motion.h1>
            </div>
          ) : (
            <>
              <HeroMascot isMobilePortrait={isMobilePortrait} />
              <motion.h1
                className="font-black uppercase tracking-tight text-neo-black dark:text-neo-white text-2xl sm:text-3xl lg:text-4xl xl:text-5xl mt-3 mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="sr-only">LexiClash — </span>
                {t('landing.welcomeTitle')}
              </motion.h1>
            </>
          )}

          <motion.p
            className={cn(
              'font-medium text-neo-black/80 dark:text-neo-white/90 max-w-md',
              isMobilePortrait ? 'text-sm mb-3' : 'text-base lg:text-lg mb-5'
            )}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {t('landing.welcomeSubtitle')}
          </motion.p>

          <motion.button
            onClick={onPlayClick}
            className={cn(
              isMobilePortrait ? 'px-6 py-2.5 w-full' : 'px-8 py-3 sm:px-10 sm:py-4',
              'bg-neo-lime text-neo-black font-black uppercase text-lg sm:text-xl',
              'border-3 border-neo-black rounded-neo shadow-hard-lg',
              'hover:shadow-hard-xl active:shadow-hard-pressed active:translate-y-[2px]',
              'transition-all duration-150'
            )}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 20 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('landing.playNowFree')}
          </motion.button>
        </div>

        {/* Right: Leaderboard Preview (hidden on mobile) */}
        {!isMobilePortrait && (
          <motion.div
            className="hidden lg:block w-80 xl:w-96 shrink-0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <LandingLeaderboardPreview players={players} loading={playersLoading} />
          </motion.div>
        )}
      </div>

      {/* Leaderboard below CTA on mobile — compact 3-player view */}
      {isMobilePortrait && players.length > 0 && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <LandingLeaderboardPreview players={players} loading={playersLoading} compact />
        </motion.div>
      )}
    </div>
  );
}
