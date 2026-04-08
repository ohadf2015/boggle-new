'use client';

import { useState } from 'react';
import { Swords, BookOpen, Map, Bomb } from 'lucide-react';
import ModeCard from './ModeCard';
import DailyChallengeBanner from '@/components/daily/DailyChallengeBanner';
import { shouldShowGuidance } from '@/utils/contextualGuidanceStorage';
import { hasCompletedOnboarding } from '@/utils/onboardingStorage';
import { isNewPlayer } from '@/utils/multiplayerProgressStorage';
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
  /** Pre-computed card order from server — static per ISR/deploy */
  cardOrder?: LandingGameMode[];
}

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingGameMode[] = ['daily', 'arena', 'practice', 'adventure'];

/** CSS stagger delay for each card index */
const cardDelay = (index: number) => `${index * 0.07}s`;

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
  cardOrder: cardOrderProp,
}: LandingChallengeCardsProps) {
  // Synchronous init from localStorage — avoids post-mount card reorder CLS
  const [isFirstTimer] = useState(() => {
    if (typeof window === 'undefined') return false;
    return shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding();
  });
  const [isNewbie] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isNewPlayer();
  });

  // New players (< 3 games) see practice first, daily always second.
  // All users: daily is guaranteed top-2 so it's never buried on mobile.
  const serverOrder = cardOrderProp ?? DEFAULT_ORDER;
  const cardOrder = isNewbie
    ? ['practice', 'daily', ...serverOrder.filter(m => m !== 'practice' && m !== 'daily')] as LandingGameMode[]
    : serverOrder[0] === 'daily' ? serverOrder
    : ['daily', ...serverOrder.filter(m => m !== 'daily')] as LandingGameMode[];

  /** Renders a card by mode key with staggered CSS animation */
  const renderCard = (mode: LandingGameMode, index: number) => {
    const style = { animationDelay: cardDelay(index) } as React.CSSProperties;

    switch (mode) {
      case 'arena':
        return (
          <div key="arena" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.arena')}
              description={t('landing.arenaDesc')}
              href={`/${language}/multiplayer`}
              icon={<Swords className="w-6 h-6" />}
              modeImage="/modes/arena.png"
              variant="pink"
              liveBadge={{ openRooms, totalPlayers, roomsLabel: t('landing.openRooms'), playersLabel: t('landing.playersLive') }}
              playerCount={{ count: activePlayers, label: t('landing.playingNow') }}
              highlighted={isFirstTimer && !isNewbie}
              highlightLabel={isFirstTimer && !isNewbie ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
            />
          </div>
        );

      case 'practice':
        return (
          <div key="practice" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.practice')}
              description={t('landing.practiceDesc')}
              href={`/${language}/singleplayer?autoStart=practice`}
              icon={<BookOpen className="w-6 h-6" />}
              modeImage="/modes/practice.png"
              variant="cyan"
              personalBest={playerAllTimeBest ? { score: playerAllTimeBest.score, label: t('landing.personalBest') } : undefined}
              highlighted={isNewbie}
              highlightLabel={isNewbie ? t('onboarding.welcome.startHere') : undefined}
              duration={t('landing.duration').replace('{time}', '1-3')}
              difficulty={1}
              difficultyLabel={t('landing.difficultyEasy')}
            />
          </div>
        );

      case 'daily':
        return (
          <div key="daily" className="w-full h-full flex flex-col animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <DailyChallengeBanner preloadedStats={dailyChallengeStats} />
          </div>
        );

      case 'adventure':
        return (
          <div key="adventure" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
            <ModeCard
              title={t('landing.adventureMode')}
              description={t('landing.adventureModeDesc')}
              href={`/${language}/adventure`}
              icon={<Map className="w-6 h-6" />}
              modeImage="/modes/adventure.png"
              variant="lime"
              duration={t('landing.duration').replace('{time}', '2-5')}
              difficulty={2}
              difficultyLabel={t('landing.difficultyMedium')}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto xl:max-w-6xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
        {cardOrder.map((mode, index) => renderCard(mode, index))}

        {/* Blast Mode (admin only) — always last */}
        {(isAdmin || hasBlastAccess) && (
          <div className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={{ animationDelay: cardDelay(cardOrder.length) }}>
            <ModeCard
              title={t('landing.blastMode')}
              description={t('landing.blastModeDesc')}
              href={`/${language}/blast`}
              icon={<Bomb className="w-6 h-6" />}
              modeImage="/modes/blast.png"
              variant="orange"
              secondary
              badge="ADMIN"
            />
          </div>
        )}
      </div>
    </div>
  );
}
