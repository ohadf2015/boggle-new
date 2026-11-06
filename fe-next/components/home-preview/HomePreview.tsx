'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import useReducedMotion from '@/hooks/useReducedMotion';
import { useAccountStreak } from '@/hooks/useAccountStreak';
import { getOrCreateStoredCustomAvatar } from '@/utils/profileStorage';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { PlayHero } from './PlayHero';
import { DailyBlock } from './DailyBlock';
import { FriendsBlock } from './FriendsBlock';
import { MoreGames } from './MoreGames';
import { ClassroomStrip } from './ClassroomStrip';
import { HOME_PREVIEW_COPY as C } from './copy';

function Wordmark() {
  return (
    <span className="font-neo-display text-xl font-bold tracking-tight text-neo-cream lg:text-3xl" dir="ltr">
      Lexi<span className="text-neo-lime">Clash</span>
    </span>
  );
}

export function HomePreview() {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const reduced = useReducedMotion();
  const { streak, loading: streakLoading } = useAccountStreak();
  const [guestAvatar, setGuestAvatar] = useState<CustomAvatarConfig | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setGuestAvatar(getOrCreateStoredCustomAvatar());
  }, []);

  const ready = mounted && !authLoading;
  const avatar = ready
    ? user
      ? { userId: user.id, customAvatar: profile?.avatar_config ?? null }
      : { userId: 'guest', customAvatar: guestAvatar }
    : null;
  const name = profile?.display_name || profile?.username;
  const greeting = name ? C.greetingUser.replace('{name}', name) : C.greetingGuest;
  const tt = t as (key: string, params?: Record<string, string | number>) => string;
  const animate = mounted && !reduced;

  return (
    <div className="min-h-dvh overflow-x-clip bg-neo-navy pb-[calc(var(--bottom-nav-height,0px)+1.5rem)]" data-testid="home-preview">
      <header className="relative z-20 mx-auto flex w-full max-w-md items-center justify-between px-4 pt-3 lg:max-w-[1600px] lg:px-14 lg:pt-8">
        <Wordmark />
        {!streakLoading && streak > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border-[3px] border-black bg-neo-orange px-3 py-1 font-neo-display text-sm font-bold text-black shadow-hard-sm lg:text-lg">
            <Flame className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={2.75} aria-hidden="true" />
            <span className="tabular-nums">{streak}</span>
          </span>
        )}
      </header>

      <div className="mx-auto w-full lg:max-w-[1600px] lg:px-14 lg:pt-6">
        <PlayHero lang={language} t={tt} animate={animate} avatar={avatar} greeting={greeting} />
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

      <div className="mt-10 lg:mt-16">
        <ClassroomStrip lang={language} t={tt} />
      </div>
    </div>
  );
}
