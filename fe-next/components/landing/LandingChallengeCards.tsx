'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import type { LandingGameMode } from '@/lib/landing/fetchGameModeStats';

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
  /** Pre-computed card order from server — static per ISR/deploy */
  cardOrder?: LandingGameMode[];
}

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingGameMode[] = ['daily', 'multiplayer', 'singleplayer', 'adventure'];

/** Scroll-triggered entrance — only animates when cards enter viewport */
const cardInitial = { opacity: 0, y: 20, scale: 0.96 };
const cardVisible = { opacity: 1, y: 0, scale: 1 };
const cardViewport = { once: true, margin: '-40px' };

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
  cardOrder: cardOrderProp,
}: LandingChallengeCardsProps) {
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding());
  }, []);

  const cardOrder = cardOrderProp ?? DEFAULT_ORDER;

  /** Renders a card by mode key with staggered animation delay */
  const renderCard = (mode: LandingGameMode, index: number) => {
    const delay = index * 0.07;

    switch (mode) {
      case 'singleplayer':
        return (
          <motion.div key="singleplayer" initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay }} className="w-full h-full">
            <ModeCard
              title={t('landing.singlePlayer')}
              description={t('landing.singlePlayerDesc')}
              href={`/${language}/singleplayer`}
              icon={<User className="w-6 h-6" />}
              variant="cyan"
              personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
              highlighted={isFirstTimer}
              highlightLabel={isFirstTimer ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={1}
              difficultyLabel={t('landing.difficultyEasy')}
            />
          </motion.div>
        );

      case 'multiplayer':
        return (
          <motion.div key="multiplayer" initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay }} className="w-full h-full">
            <ModeCard
              title={t('landing.multiplayer')}
              description={t('landing.multiplayerDesc')}
              href={`/${language}/multiplayer`}
              icon={<Users className="w-6 h-6" />}
              variant="pink"
              liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
              playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
            />
          </motion.div>
        );

      case 'daily':
        return (
          <motion.div key="daily" initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay }} className="w-full h-full flex flex-col">
            <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
            {solveRate !== null && (
              <p className="text-center text-neo-white/50 text-xs mt-1.5 pb-1 font-medium">
                {t('landing.solvedPercent').replace('{percent}', String(solveRate))}
              </p>
            )}
          </motion.div>
        );

      case 'adventure':
        return (
          <motion.div key="adventure" initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay }} className="w-full h-full">
            <ModeCard
              title={t('landing.adventureMode')}
              description={t('landing.adventureModeDesc')}
              href={`/${language}/adventure`}
              icon={<Map className="w-6 h-6" />}
              variant="lime"
              duration={t('landing.duration').replace('{time}', '2-5')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
            />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {cardOrder.map((mode, index) => renderCard(mode, index))}

        {/* Blast Mode (admin only) — always last */}
        {(isAdmin || hasBlastAccess) && (
          <motion.div initial={cardInitial} whileInView={cardVisible} viewport={cardViewport} transition={{ type: 'spring', stiffness: 300, damping: 26, delay: cardOrder.length * 0.07 }} className="w-full h-full">
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
