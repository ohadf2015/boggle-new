'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useAccountStreak } from '@/hooks/useAccountStreak';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PlayHero } from './PlayHero';
import { DailyBlock } from './DailyBlock';
import { FriendsBlock } from './FriendsBlock';
import { MoreGames } from './MoreGames';
import { ClassroomStrip } from './ClassroomStrip';
import { FreshAdSlot } from '@/components/landing/fresh/FreshAdSlot';
import { pickHeroAvatar, type HeroAvatar } from './heroAvatar';
import { readLastAccountAvatar } from '@/utils/accountAvatarCache';

export function HomePreview({ onPlay }: { onPlay?: () => void } = {}) {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();
  const { streak, loading: streakLoading } = useAccountStreak();
  const [guestAvatar, setGuestAvatar] = useState<CustomAvatarConfig | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastAccount, setLastAccount] = useState<HeroAvatar | null>(null);

  useEffect(() => {
    setMounted(true);
    setGuestAvatar(getOrCreateStoredCustomAvatar());
    const last = readLastAccountAvatar();
    setLastAccount(last ? { userId: last.userId, customAvatar: last.config } : null);
  }, []);

  const ready = mounted && (!authLoading || !hasSupabaseSession());
  // While a saved session is still being restored, the last account's avatar
  // (or the placeholder) holds the spot: no guest face, no id-generated face.
  const avatar = ready ? pickHeroAvatar(user?.id ?? null, profile, guestAvatar) : mounted ? lastAccount : null;
  const name = profile?.display_name || profile?.username;
  const greeting = name ? t('homePlay.greetingUser', { name }) : t('homePlay.greetingGuest');
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  const animate = mounted && !reduced;

  return (
    <div className="overflow-x-clip bg-neo-navy pb-8" data-testid="home-preview">
      <div className="mx-auto w-full lg:max-w-[1600px] lg:px-14 lg:pt-6">
        <PlayHero
          lang={language}
          t={tt}
          animate={animate}
          avatar={avatar}
          greeting={greeting}
          streak={streak}
          streakLoading={streakLoading}
          onAvatarSaved={setGuestAvatar}
          onPlay={onPlay}
        />
      </div>

      <div className="mx-auto mt-8 grid w-full max-w-md gap-8 px-4 lg:mt-14 lg:max-w-[1600px] lg:grid-cols-12 lg:gap-10 lg:px-14">
        <div className="lg:col-span-7">
          <DailyBlock lang={language} t={tt} streak={streak} streakLoading={streakLoading} />
        </div>
        <div className="lg:col-span-5">
          <FriendsBlock lang={language} t={tt} showAvatars={mounted} />
        </div>
        <div className="lg:col-span-12">
          <MoreGames lang={language} t={tt} />
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
