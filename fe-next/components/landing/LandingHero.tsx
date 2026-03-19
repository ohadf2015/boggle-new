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
}

const HeroMascot = memo(function HeroMascot({ isMobilePortrait }: { isMobilePortrait: boolean }) {
  return (
    <IdleMascotWithEntrance
      baseVariant="happy"
      size="xl"
      sizeClassName={isMobilePortrait ? 'w-16 h-16' : 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40'}
      enableHover={!isMobilePortrait}
      enableClick
      hoverVariant="excited"
      clickVariant="celebrating"
      clickAnimation="bounce"
      delay={0.1}
    />
  );
});

export function LandingHero({ players, playersLoading, isMobilePortrait }: LandingHeroProps) {
  const { t } = useLanguage();

  return (
    <div className={cn(
      'w-full max-w-5xl mx-auto',
      isMobilePortrait ? 'px-2' : 'px-4 md:px-5 lg:px-6'
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
                className="font-black uppercase tracking-tight text-neo-white text-xl neo-title"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
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
                className="font-black uppercase tracking-tight text-neo-white text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl mt-3 mb-2 neo-title"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
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
              isMobilePortrait ? 'text-sm mb-3' : 'text-base md:text-lg mb-5'
            )}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            {t('landing.welcomeSubtitle')}
          </motion.p>

        </div>

        {/* Right: Leaderboard Preview (visible on tablet+) */}
        {!isMobilePortrait && (
          <motion.div
            className="hidden md:block w-64 lg:w-80 xl:w-[26rem] shrink-0"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <LandingLeaderboardPreview players={players} loading={playersLoading} />
          </motion.div>
        )}
      </div>

      {/* Leaderboard below CTA on mobile — compact 3-player view */}
      {isMobilePortrait && (
        <motion.div
          className="mt-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45 }}
        >
          <LandingLeaderboardPreview players={players} loading={playersLoading} compact />
        </motion.div>
      )}
    </div>
  );
}
