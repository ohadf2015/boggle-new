'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileData } from '@/contexts/auth/authTypes';
import type { LandingGameMode } from '@/lib/landing/fetchGameModeStats';
import type { TopPlayer } from '@/hooks/useTopPlayers';
import { LandingChallengeCards } from '../LandingChallengeCards';
import { LandingLeaderboardPreview } from '../LandingLeaderboardPreview';
import { HomeTopBar } from './HomeTopBar';
import { HomeSocialStrip } from './HomeSocialStrip';
import { HomeRankCard } from './HomeRankCard';

interface DailyChallengePreloadedStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber: number;
  loading: boolean;
}

interface HomeHubProps {
  className?: string;
  profile: ProfileData | null;
  language: string;
  isAdmin?: boolean;
  /** live-room stats (active players powers the section live pill + arena count) */
  liveRoomStats: { activePlayers: number; openRooms: number; totalPlayers: number };
  /** landing-stats feed for the social strip */
  gamesToday: number;
  gameModes: number;
  languages: number;
  playerAllTimeBest: { score: number } | null;
  dailyChallengeStats: DailyChallengePreloadedStats;
  cardOrder?: LandingGameMode[];
  topPlayers: TopPlayer[];
  topPlayersLoading: boolean;
}

/**
 * HomeHub — the focused mobile arcade home (CSS-gated `md:hidden`; the desktop
 * landing renders the classic tree unchanged). Composes the redesign top-to-bottom:
 * top bar → promoted Daily hero + mode bento (via `LandingChallengeCards layout="hub"`,
 * reusing the SAME gated model list) → 4-stat social strip → Your Rank card →
 * compact leaderboard. Bottom padding clears the app-wide `GlobalBottomNav`
 * (consumes `--bottom-nav-height`).
 */
export function HomeHub({
  className,
  profile,
  language,
  isAdmin,
  liveRoomStats,
  gamesToday,
  gameModes,
  languages,
  playerAllTimeBest,
  dailyChallengeStats,
  cardOrder,
  topPlayers,
  topPlayersLoading,
}: HomeHubProps) {
  const { t } = useLanguage();

  return (
    <div className={cn('flex w-full flex-col gap-[18px] px-1.5 pt-1', className)}>
      <HomeTopBar profile={profile} streak={dailyChallengeStats.currentStreak} language={language} t={t} />

      <LandingChallengeCards
        layout="hub"
        language={language}
        isAdmin={isAdmin}
        hasBlastAccess={true}
        activePlayers={liveRoomStats.activePlayers}
        openRooms={liveRoomStats.openRooms}
        totalPlayers={liveRoomStats.totalPlayers}
        playerAllTimeBest={playerAllTimeBest}
        t={t}
        dailyChallengeStats={dailyChallengeStats}
        cardOrder={cardOrder}
      />

      <HomeSocialStrip
        activePlayers={liveRoomStats.activePlayers}
        gamesToday={gamesToday}
        gameModes={gameModes}
        languages={languages}
        t={t}
      />

      <HomeRankCard playerAllTimeBest={playerAllTimeBest} t={t} />

      <LandingLeaderboardPreview players={topPlayers} loading={topPlayersLoading} compact />
    </div>
  );
}

export default HomeHub;
