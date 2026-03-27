'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import type { GameModeStats, LandingGameMode } from '@/lib/landing/fetchGameModeStats';

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
  /** Per-mode play counts — cards reorder based on popularity when provided */
  gameModeStats?: GameModeStats[];
}

/** Default card order when no stats available */
const DEFAULT_ORDER: LandingGameMode[] = ['daily', 'multiplayer', 'singleplayer', 'adventure'];

/** Modes that are pinned to the front in this order, regardless of popularity */
const PINNED_FIRST: LandingGameMode[] = ['daily', 'multiplayer'];

/** Scroll-triggered entrance — only animates when cards enter viewport */
const cardInitial = { opacity: 0, y: 20, scale: 0.96 };
const cardVisible = { opacity: 1, y: 0, scale: 1 };
const cardViewport = { once: true, margin: '-40px' };

/** Compute card order from popularity stats. Blast is excluded (shown separately). */
export function getCardOrder(stats?: GameModeStats[]): LandingGameMode[] {
  if (!stats || stats.length === 0) return DEFAULT_ORDER;

  // Filter to main 4 modes (blast handled separately), keep popularity order
  const mainModes: LandingGameMode[] = stats
    .filter(s => s.mode !== 'blast')
    .map(s => s.mode);

  // If all counts are 0 (no data yet), keep default order
  const hasData = stats.some(s => s.playCount > 0 && s.mode !== 'blast');
  if (!hasData) return DEFAULT_ORDER;

  // Ensure all 4 modes are present (in case DB is missing some)
  for (const mode of DEFAULT_ORDER) {
    if (!mainModes.includes(mode)) {
      mainModes.push(mode);
    }
  }

  // Pin certain modes to the front (e.g., daily challenge always first)
  const pinned = PINNED_FIRST.filter(m => mainModes.includes(m));
  const unpinned = mainModes.filter(m => !PINNED_FIRST.includes(m));

  return [...pinned, ...unpinned];
}

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
  gameModeStats,
}: LandingChallengeCardsProps) {
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding());
  }, []);

  const cardOrder = useMemo(() => getCardOrder(gameModeStats), [gameModeStats]);

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
