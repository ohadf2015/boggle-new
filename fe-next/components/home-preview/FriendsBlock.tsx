'use client';

import Link from 'next/link';
import { PressSurface } from '@/components/motion/PressSurface';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { setFriendsAvatarsEnabled, setHeroAvatarSlot } from './heroAvatarBridge';

const HomeCrewCard = dynamic(() => import('./HomeCrewCard').then((m) => m.HomeCrewCard), {
  ssr: false,
  loading: () => (
    <div aria-hidden="true" className="h-full min-h-[22rem] rounded-3xl border-[3px] border-black bg-neo-pink shadow-hard-lg lg:min-h-[26rem]" />
  ),
});

const ROOM_CODE = ['K', '7', 'Q', 'B'];
const TILE_TILT = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3'];

interface FriendsBlockProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  showAvatars: boolean;
}

/** Signed-in players get their real crew; guests (and first paint) get the demo room. */
export function FriendsBlock(props: FriendsBlockProps) {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const signedIn = mounted && (!!user || (loading && hasSupabaseSession()));
  return signedIn ? <HomeCrewCard lang={props.lang} t={props.t} /> : <FriendsDemo {...props} />;
}

/** A live room in miniature: two players squaring off over a room code. */
function FriendsDemo({ lang, t, showAvatars }: FriendsBlockProps) {
  // The demo faces stay OUT of the landing module graph: this block publishes
  // two empty boxes on heroAvatarBridge and HeroAvatarIsland (runtime import()
  // from HeroAvatarMount) portals the seeded Avatars in after first paint —
  // LandingView.bundleGraph.test.ts. The boxes are fixed-size, so no CLS.
  const youSlotCallback = useCallback((el: HTMLDivElement | null) => setHeroAvatarSlot('friendsYou', el), []);
  const rivalSlotCallback = useCallback((el: HTMLDivElement | null) => setHeroAvatarSlot('friendsRival', el), []);

  useEffect(() => {
    setFriendsAvatarsEnabled(showAvatars);
    return () => setFriendsAvatarsEnabled(false);
  }, [showAvatars]);
  return (
    <section
      aria-labelledby="hp-friends-title"
      className="relative flex h-full flex-col gap-4 rounded-3xl border-[3px] border-black bg-neo-pink p-4 text-black shadow-hard-lg lg:gap-6 lg:p-8"
      data-testid="hp-friends"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-neo-display text-xs font-bold tracking-widest uppercase lg:text-sm">
            <Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
            {t('nav.play')}
          </p>
          <h2 id="hp-friends-title" className="mt-1 font-neo-display text-xl font-bold leading-tight lg:text-4xl">
            {t('homeFresh.sections.friends.title')}
          </h2>
          <p className="mt-1 text-sm font-medium lg:text-lg">{t('homeFresh.sections.friends.line')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-2xl border-[3px] border-black bg-neo-navy px-2.5 py-3 sm:px-3 lg:px-6 lg:py-5">
        <div className="flex flex-col items-center gap-1">
          <div className="h-14 w-14 lg:h-20 lg:w-20">
            {showAvatars && <div ref={youSlotCallback} data-testid="hp-friend-you-slot" className="h-full w-full" />}
          </div>
          <span className="text-[11px] font-bold text-neo-cream lg:text-sm">{t('homeFresh.sections.friends.you')}</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-[0.2em] text-neo-white/60 uppercase lg:text-xs">
            {t('homeFresh.sections.friends.room')}
          </span>
          <div className="flex gap-1 sm:gap-1.5" dir="ltr">
            {ROOM_CODE.map((ch, i) => (
              <span
                key={ch}
                className={`flex h-9 w-7 items-center justify-center rounded-lg sm:w-8 border-[3px] border-black bg-neo-cream font-neo-display text-lg font-bold text-black shadow-hard-sm lg:h-14 lg:w-12 lg:text-3xl ${TILE_TILT[i]}`}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="h-14 w-14 lg:h-20 lg:w-20">
            {showAvatars && <div ref={rivalSlotCallback} data-testid="hp-friend-rival-slot" className="h-full w-full" />}
          </div>
          <span className="text-[11px] font-bold text-neo-cream lg:text-sm">{t('homeFresh.sections.friends.rival')}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <PressSurface asChild lip={4}>
          <Link
            href={`/${lang}/multiplayer`}
            data-testid="hp-friends-start"
            className="flex-1 rounded-xl border-[3px] border-black bg-black px-4 py-2.5 text-center font-neo-display text-sm font-bold whitespace-nowrap text-neo-pink lg:py-3.5 lg:text-lg"
          >
            {t('homeFresh.sections.friends.cta')}
          </Link>
        </PressSurface>
        <Link
          href={`/${lang}/multiplayer`}
          data-testid="hp-friends-join"
          className="px-1 py-2 font-neo-display text-sm font-bold whitespace-nowrap underline decoration-2 underline-offset-4 lg:text-lg"
        >
          {t('homePlay.friendsJoin')}
        </Link>
      </div>
    </section>
  );
}
