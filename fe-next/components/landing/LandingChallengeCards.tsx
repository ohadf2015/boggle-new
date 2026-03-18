'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface LandingChallengeCardsProps {
  language: string;
  isAdmin: boolean;
  hasBlastAccess: boolean;
  activePlayers: number;
  openRooms: number;
  totalPlayers: number;
  playerAllTimeBest: { score: number } | null;
  t: (key: string) => string;
  dailyChallengeStats: DailyChallengePreloadedStats;
  solveRate: number | null;
}

const cardMotion = {
  initial: { opacity: 0, y: 20, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export function LandingChallengeCards({
  language,
  isAdmin,
  hasBlastAccess,
  activePlayers,
  openRooms,
  totalPlayers,
  playerAllTimeBest,
  t,
  dailyChallengeStats,
  solveRate,
}: LandingChallengeCardsProps) {
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted'));
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {/* Single Player (cyan) */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.05 }} className="w-full h-full">
          <ModeCard
            title={t('landing.singlePlayer')}
            description={t('landing.singlePlayerDesc')}
            href={`/${language}/singleplayer`}
            icon={<User className="w-6 h-6" />}
            variant="cyan"
            personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
            highlighted={isFirstTimer}
            highlightLabel={isFirstTimer ? t('onboarding.welcome.startHere') : undefined}
          />
        </motion.div>

        {/* Multiplayer (pink) */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.1 }} className="w-full h-full">
          <ModeCard
            title={t('landing.multiplayer')}
            description={t('landing.multiplayerDesc')}
            href={`/${language}/multiplayer`}
            icon={<Users className="w-6 h-6" />}
            variant="pink"
            liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
            playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
          />
        </motion.div>

        {/* Daily Challenge Banner */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.15 }} className="col-span-1 sm:col-span-2 xl:col-span-1">
          <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          {solveRate !== null && (
            <p className="text-center text-neo-white/50 text-xs mt-1 font-medium">
              {t('landing.solvedPercent').replace('{percent}', String(solveRate))}
            </p>
          )}
        </motion.div>

        {/* Adventure Mode - full width on mobile/tablet, single col on xl */}
        <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.25 }} className="col-span-1 sm:col-span-2 xl:col-span-1 w-full">
          <ModeCard
            title={t('landing.adventureMode')}
            description={t('landing.adventureModeDesc')}
            href={`/${language}/adventure`}
            icon={<Map className="w-6 h-6" />}
            variant="lime"
          />
        </motion.div>

        {/* Blast Mode (admin only) */}
        {(isAdmin || hasBlastAccess) && (
          <motion.div {...cardMotion} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.35 }} className="col-span-1 sm:col-span-2 xl:col-span-1 w-full xl:max-w-none max-w-md mx-auto">
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              variant="orange"
              secondary
              badge="ADMIN"
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
