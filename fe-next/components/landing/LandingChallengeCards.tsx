'use client';

import { useState, useEffect } from 'react';
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
  /** Pre-computed card order from server — static per ISR/deploy */
  cardOrder?: LandingGameMode[];
}

/** Default card order when no server data available */
const DEFAULT_ORDER: LandingGameMode[] = ['daily', 'multiplayer', 'singleplayer', 'adventure'];

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
  const [isFirstTimer, setIsFirstTimer] = useState(false);
  useEffect(() => {
    setIsFirstTimer(shouldShowGuidance('firstPlayTutorialCompleted') && !hasCompletedOnboarding());
  }, []);

  const cardOrder = cardOrderProp ?? DEFAULT_ORDER;

  /** Renders a card by mode key with staggered CSS animation */
  const renderCard = (mode: LandingGameMode, index: number) => {
    const style = { animationDelay: cardDelay(index) } as React.CSSProperties;

    switch (mode) {
      case 'singleplayer':
        return (
          <div key="singleplayer" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
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
          </div>
        );

      case 'multiplayer':
        return (
          <div key="multiplayer" className="w-full h-full animate-[fadeInUp_0.4s_ease-out_both]" style={style}>
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
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
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
