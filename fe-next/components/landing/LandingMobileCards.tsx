'use client';

import { Suspense, lazy, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Bot, Trophy, LayoutGrid, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LandingShareBanner } from './LandingShareBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import { trackModeSelected } from '@/utils/growthTracking';

const DailyChallengeBanner = lazy(() => import('@/components/daily/DailyChallengeBanner'));

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface LandingMobileCardsProps {
  language: string;
  isMobilePortrait: boolean;
  isAdmin: boolean;
  hasBlastAccess: boolean;
  activePlayers: number;
  t: (key: string) => string;
  onSinglePlayerClick: (e: React.MouseEvent) => void;
  onShareClick: () => void;
  dailyChallengeStats: DailyChallengePreloadedStats;
}

export function LandingMobileCards({
  language,
  isMobilePortrait,
  isAdmin,
  hasBlastAccess,
  activePlayers,
  t,
  onSinglePlayerClick,
  onShareClick,
  dailyChallengeStats,
}: LandingMobileCardsProps): React.JSX.Element {
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding());
  }, []);

  return (
    <div className='flex flex-col w-full'>
      {/* 2-column grid layout */}
      <div className="w-full animate-fade-in-fast grid grid-cols-2 gap-2 sm:gap-3 min-h-0 auto-rows-auto content-center">
        {/* Single Player Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.05 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="group"
        >
          <Link
            href={`/${language}/singleplayer${isFirstTimer ? '' : '?autoStart=bots'}`}
            onClick={onSinglePlayerClick}
            className={cn(
              'relative flex flex-col items-center justify-center gap-1 sm:gap-2 p-1.5 sm:p-3',
              'bg-gradient-to-br from-neo-cyan to-cyan-400',
              'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
              'transition-all duration-200 min-h-[68px] sm:min-h-[88px]',
              'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgb(0_255_255/0.4))]',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
              isFirstTimer && 'ring-4 ring-neo-yellow ring-offset-2 ring-offset-neo-navy [filter:drop-shadow(0_0_24px_rgb(0_255_255/0.5))]'
            )}
            aria-label={`${t('landing.singlePlayer')} - ${t('landing.singlePlayerDesc')}`}
          >
            {isFirstTimer && (
              <motion.span
                className="absolute -top-2.5 end-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 bg-neo-yellow text-neo-black font-black uppercase text-[9px] border-2 border-neo-black rounded-neo shadow-hard-sm rotate-3 rtl:-rotate-3"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neo-black" />
                </span>
                {t('onboarding.welcome.startHere')}
              </motion.span>
            )}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <Image src="/modes/practice.png" alt="" fill className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" sizes="48px" />
            </div>
            <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.singlePlayer')}</span>
            {!isMobilePortrait && (
              <div className="flex gap-2 text-xs" aria-hidden="true">
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Bot className="inline w-3 h-3 me-1" />Bots</span>
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Trophy className="inline w-3 h-3 me-1" />Challenges</span>
              </div>
            )}
          </Link>
        </motion.div>

        {/* Multiplayer Card */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.1 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="group"
        >
          <Link
            href={`/${language}/multiplayer`}
            onClick={() => trackModeSelected('multiplayer', 'home_mobile')}
            className={cn(
              'flex flex-col items-center justify-center gap-1 sm:gap-2 p-1.5 sm:p-3',
              'bg-gradient-to-br from-neo-pink to-pink-400',
              'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
              'transition-all duration-200 min-h-[68px] sm:min-h-[88px]',
              'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgb(255_20_147/0.4))]',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
            )}
            aria-label={`${t('landing.multiplayer')} - ${t('landing.multiplayerDesc')}`}
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              <Image src="/modes/arena.png" alt="" fill className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" sizes="48px" />
            </div>
            <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.multiplayer')}</span>
            {activePlayers > 0 && (
              <div className="flex items-center gap-1 bg-neo-lime text-neo-black px-2 py-0.5 rounded-neo border border-neo-black shadow-hard-xs text-xs font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-black opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neo-black" />
                </span>
                {activePlayers} {t('landing.playingNow')}
              </div>
            )}
            {!isMobilePortrait && activePlayers === 0 && (
              <div className="flex gap-2 text-xs" aria-hidden="true">
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><LayoutGrid className="inline w-3 h-3 me-1" />Rooms</span>
                <span className="bg-neo-black/20 px-2 py-1 rounded-neo font-bold"><Crown className="inline w-3 h-3 me-1" />Host</span>
              </div>
            )}
          </Link>
        </motion.div>

        {/* Daily Challenge Banner */}
        <div className="col-span-2">
          <Suspense fallback={
            <div
              className="w-full p-1.5 sm:p-2.5 rounded-neo border-3 border-neo-black shadow-hard-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500"
              style={{ minHeight: '52px' }}
            >
              <div className="flex items-center gap-3 sm:gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-neo bg-neo-navy shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-5 w-36 bg-neo-black/15 rounded" />
                  <div className="h-3 w-24 bg-neo-black/10 rounded" />
                </div>
              </div>
            </div>
          }>
            <DailyChallengeBanner compact preloadedStats={dailyChallengeStats} />
          </Suspense>
        </div>

        {/* Adventure Mode Card */}
        <motion.div
          className="col-span-2 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Link
            href={`/${language}/adventure`}
            onClick={() => trackModeSelected('adventure', 'home_mobile')}
            className={cn(
              'flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-2.5 relative',
              'bg-gradient-to-br from-neo-lime via-lime-400 to-lime-500',
              'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
              'transition-all duration-200',
              'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgb(163_230_53/0.5))]',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
            )}
            aria-label={`${t('landing.adventureMode')} - ${t('landing.adventureModeDesc')}`}
          >
            <div className="flex-shrink-0 relative w-10 h-10 sm:w-12 sm:h-12">
              <Image src="/modes/adventure.png" alt="" fill className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" sizes="48px" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm sm:text-base font-black uppercase text-neo-black leading-tight">
                {t('landing.adventureMode')}
              </span>
              <span className="block text-xs sm:text-sm text-neo-black/65 font-semibold mt-0.5 truncate">
                {t('landing.adventureModeDesc')}
              </span>
            </div>
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neo-black/40" aria-hidden="true" />
            </div>
          </Link>
        </motion.div>

        {/* Blast Mode Card */}
        {(isAdmin || hasBlastAccess) && (
          <motion.div
            className="col-span-2 group"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link
              href={`/${language}/blast`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 sm:gap-2 p-2 sm:p-4 relative',
                'bg-gradient-to-br from-neo-orange to-amber-500',
                'border-3 sm:border-4 border-neo-black rounded-neo shadow-hard',
                'transition-all duration-200 min-h-[64px] sm:min-h-[80px]',
                'group-hover:shadow-hard-lg group-hover:[filter:drop-shadow(0_0_20px_rgb(255_107_53/0.4))]',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy'
              )}
              aria-label={`${t('landing.blastMode')} - ${t('landing.blastModeDesc')}`}
            >
              <span className="absolute top-1 end-1 sm:top-2 sm:end-2 px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-neo-navy text-neo-white font-black uppercase text-[8px] sm:text-[10px] border border-neo-black rounded-neo shadow-hard-xs transform rotate-3 rtl:-rotate-3">
                ADMIN
              </span>
              <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                <Image src="/modes/blast.png" alt="" fill className="object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.3)]" sizes="48px" />
              </div>
              <span className="text-sm sm:text-lg font-black uppercase text-neo-black text-center">{t('landing.blastMode')}</span>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Share banner */}
      <div className="w-full mt-2">
        <LandingShareBanner onShareClick={onShareClick} />
      </div>
    </div>
  );
}
