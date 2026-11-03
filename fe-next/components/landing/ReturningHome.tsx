'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLiveRoomStats } from '@/hooks/useLiveRoomStats';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { useDailyChallengeStatus } from '@/hooks/useDailyChallengeStatus';
import { useWeeklyChest } from '@/hooks/useWeeklyChest';
import { useEvents } from '@/hooks/useEvents';
import { hasCompletedOnboarding, markOnboardingComplete } from '@/utils/onboardingStorage';
import { getPerfVariant } from '@/utils/perfVariant';
import type { LandingInitialData } from '@/lib/landing/fetchLandingData';
import { isDashboardProfileLoading } from '@/lib/landing/dashboardReadiness';
import { LandingChallengeCards } from './LandingChallengeCards';
import { HomeTopBar } from './home/HomeTopBar';
import { HomeDailyHero } from './home/HomeDailyHero';
import { LaunchProvider } from './home/HomeLaunch';
import { HomeEducationCardConnected } from '@/components/education/HomeEducationCardConnected';

const EventBanner = dynamic(() => import('@/components/events/EventBanner'), { ssr: false });
const PlayfulBackground = dynamic(
  () => import('@/components/ui/PlayfulBackground').then((m) => m.PlayfulBackground),
  { ssr: false }
);

interface ReturningHomeProps {
  /** Pre-fetched server data — eliminates client-side waterfall fetches */
  initialData?: LandingInitialData;
}

/**
 * The returning-user homepage. Above the fold: top bar (profile, streak, coins)
 * and today's daily as the one primary action. Below it every mode is on the
 * page, sorted by intent (play together, play solo, take your time) so nothing
 * hides behind a "more" button. Every door opens through the launch curtain.
 */
export const ReturningHome: React.FC<ReturningHomeProps> = ({ initialData }) => {
  const { t, language } = useLanguage();
  const { profile, user, loading: authLoading } = useAuth();
  // Keep the profile-derived top bar in its skeleton until the profile lands,
  // so the guest "Player" default never snaps to the real name.
  const dashboardProfileLoading = isDashboardProfileLoading(authLoading, user, profile);
  const isMobilePortrait = useMobilePortrait();

  const liveRoomStats = useLiveRoomStats();
  const { allTimeBest: playerAllTimeBest } = usePlayerStats();
  const dailyChallengeStatus = useDailyChallengeStatus(language as 'en' | 'he' | 'sv' | 'ja' | 'es');
  // Single source of truth for the "fire" streak: the weekly-chest endpoint counts
  // ALL daily modes + freezes (useDailyChallengeStatus alone only knew Word-Hunt).
  const weeklyChest = useWeeklyChest();
  const { activeEvents, myEvents, joinEvent: joinEventAction } = useEvents();

  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());
  const visibleEvent = activeEvents.find((e) => !dismissedEventIds.has(e.id));
  const handleDismissEvent = useCallback(() => {
    if (visibleEvent) setDismissedEventIds((prev) => new Set([...prev, visibleEvent.id]));
  }, [visibleEvent]);

  // Mark returning players (cleared localStorage) as onboarded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasCompletedOnboarding()) return;
    if (profile?.total_games && profile.total_games > 0) {
      markOnboardingComplete({
        avatarId: profile.avatar_image || 'default',
        displayName: profile.display_name || profile.username || 'Player',
        selectedMode: null,
      });
    }
  }, [profile]);

  const [enableHeavyBackground, setEnableHeavyBackground] = useState(false);
  useEffect(() => { setEnableHeavyBackground(getPerfVariant() === 'control'); }, []);

  const dailyChallengeStats = {
    hasPlayed: dailyChallengeStatus.hasPlayed,
    hasSolved: dailyChallengeStatus.hasSolved,
    // Prefer the chest-authoritative streak once it has resolved (a real
    // cycleStart proves the server replied for an authed user).
    currentStreak: weeklyChest.cycleStart
      ? weeklyChest.currentStreak
      : dailyChallengeStatus.currentStreak,
    puzzleNumber: dailyChallengeStatus.puzzleNumber,
    loading: dailyChallengeStatus.loading,
  };

  return (
    <LaunchProvider>
      {enableHeavyBackground && !isMobilePortrait && <PlayfulBackground intensity="high" colorScheme="default" />}

      {visibleEvent && (
        <div className="w-full max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 xl:px-8 pt-2">
          <EventBanner
            event={visibleEvent}
            onJoin={(id) => joinEventAction(id)}
            onDismiss={handleDismissEvent}
            hasJoined={myEvents.some((e) => e.id === visibleEvent.id)}
          />
        </div>
      )}

      <section className="relative z-20 mx-auto flex min-h-[calc(100dvh-var(--header-height-mobile)-var(--bottom-stack-height,0px))] w-full max-w-6xl flex-col gap-3 overflow-x-clip px-3 pb-3 pt-2 sm:px-4 md:min-h-[calc(100dvh-var(--header-height-desktop))] md:gap-8 md:px-8 md:py-5">
        <HomeTopBar
          profile={profile}
          language={language}
          t={t}
          profileLoading={dashboardProfileLoading}
        />

        <HomeDailyHero preloadedStats={dailyChallengeStats} />
        <LandingChallengeCards
          language={language}
          activePlayers={liveRoomStats.activePlayers}
          playerAllTimeBest={playerAllTimeBest}
          t={t}
          cardOrder={initialData?.cardOrder}
        />
        {/* Education entry: teacher dashboard, the student's class, or the
            classroom-mode promo for everyone else. Slim, after the modes. */}
        <HomeEducationCardConnected />
      </section>
    </LaunchProvider>
  );
};
