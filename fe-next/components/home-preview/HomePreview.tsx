'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasCrosswordPuzzles } from '@/lib/crossword/locales';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useStreakView } from '@/hooks/useStreakView';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PlayHero } from './PlayHero';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { DailyBlock } from './DailyBlock';
import { StreakSavedToast } from '@/components/streak/StreakSavedToast';
import { StreakMilestoneCheer } from '@/components/streak/StreakMilestoneCheer';
import { FriendsBlock } from './FriendsBlock';
import { MoreGames } from './MoreGames';
import { HomeAdventureCard } from '@/components/landing/home/HomeAdventureCard';
import { WeeklyThemeCard } from '@/components/daily/WeeklyThemeCard';
import { ClassroomStrip } from './ClassroomStrip';
import { HomeEducationCardConnected } from '@/components/education/HomeEducationCardConnected';
import { FreshAdSlot } from '@/components/landing/fresh/FreshAdSlot';
import { pickHeroAvatar, type HeroAvatar } from './heroAvatar';
import { heroBubble, type HeroBubbleLine } from './heroBubble';
import { quickRoundsPlayed } from '@/lib/quickPlay/guestProgress';
import { readLastAccountAvatar } from '@/utils/accountAvatarCache';

export function HomePreview({ onPlay }: { onPlay?: () => void } = {}) {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading, canSeeInWorkModes } = useAuth();
  const reduced = useReducedMotion();
  const streakView = useStreakView();
  const { current: streak, loading: streakLoading, freezes } = streakView;
  const [guestAvatar, setGuestAvatar] = useState<CustomAvatarConfig | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastAccount, setLastAccount] = useState<HeroAvatar | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      setRoundsPlayed(quickRoundsPlayed());
    } catch {
      /* storage blocked: reads as a first visit */
    }
    setGuestAvatar(getOrCreateStoredCustomAvatar());
    const last = readLastAccountAvatar();
    setLastAccount(last ? { userId: last.userId, customAvatar: last.config } : null);
  }, []);

  const ready = mounted && (!authLoading || !hasSupabaseSession());
  // While a saved session is still being restored, the last account's avatar
  // (or the placeholder) holds the spot: no guest face, no id-generated face.
  const avatar = ready ? pickHeroAvatar(user?.id ?? null, profile, guestAvatar) : mounted ? lastAccount : null;
  const name = profile?.display_name || profile?.username;
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  const animate = mounted && !reduced;
  // The line is picked once, when auth, profile, streak and this device's rounds are all known, then frozen.
  const liveLine = heroBubble({ ready: ready && !streakLoading && (!user || !!profile), roundsPlayed, streak, atRisk: streakView.atRisk, name });
  const [line, setLine] = useState<HeroBubbleLine | null>(null);
  if (!line && liveLine) setLine(liveLine);

  return (
    <div className="overflow-x-clip bg-neo-navy pb-8" data-testid="home-preview">
      {/* Teachers: their class first, above the play hero. Renders nothing for anyone else. */}
      <div className="mx-auto w-full max-w-[480px] px-4 pt-3 empty:hidden lg:max-w-4xl lg:pt-6">
        <HomeEducationCardConnected slot="top" />
      </div>
      <div className="relative isolate">
        <AmbientBackdrop theme="home" hill={false} className="max-lg:bottom-[68%]" />
        <PlayHero
          lang={language}
          t={tt}
          animate={animate}
          avatar={avatar}
          bubble={line ? tt(line.key, line.params) : null}
          streak={streak}
          streakLoading={streakLoading}
          atRisk={streakView.atRisk}
          playedToday={streakView.playedToday}
          onAvatarSaved={setGuestAvatar}
          onPlay={onPlay}
        />
      </div>

      {/* grid-cols-1, not an implicit column: an implicit `auto` track sizes itself
          to its widest unbreakable content (a truncated crew line, the week strip),
          grows past the phone, and overflow-x-clip above cuts every card on one edge.
          min-w-0 on each cell lets truncate/wrap work inside the track. */}
      <div
        data-testid="hp-cards"
        className="mx-auto mt-16 grid w-full max-w-[480px] grid-cols-1 gap-8 lg:mt-10 lg:max-w-4xl lg:grid-cols-2 lg:gap-6 lg:px-6"
      >
        <div className="flex min-w-0 flex-col gap-4 px-4 lg:px-0">
          <DailyBlock
            lang={language}
            t={tt}
            streak={streak}
            streakLoading={streakLoading}
            freezes={freezes}
            atRisk={streakView.atRisk}
            week={mounted ? streakView.week : undefined}
            next={streakView.milestone?.next ?? null}
            isGuest={streakView.isGuest}
            onStreakChanged={() => streakView.refresh(true)}
          />
          <StreakSavedToast saved={streakView.loading ? null : streakView.freezeSaved} />
          <StreakMilestoneCheer view={streakView} />
          <WeeklyThemeCard lang={language} t={tt} source="home" compact />
        </div>
        <div className="min-w-0 px-4 lg:px-0">
          <FriendsBlock lang={language} t={tt} showAvatars={mounted} />
        </div>
        <div className="min-w-0 px-4 lg:col-span-2 lg:px-0">
          <HomeAdventureCard />
        </div>
        <div className="min-w-0 px-4 lg:col-span-2 lg:px-0">
          <MoreGames lang={language} t={tt} hideAdventure showCrossword={canSeeInWorkModes && hasCrosswordPuzzles(language)} />
        </div>
      </div>

      <div className="mt-8">
        <FreshAdSlot />
      </div>

      <div className="mt-10 lg:mt-16">
        <ClassroomStrip lang={language} t={tt} />
      </div>
    </div>
  );
}
