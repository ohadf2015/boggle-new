'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import Avatar from '@/components/Avatar';

const ROOM_CODE = ['K', '7', 'Q', 'B'];
const TILE_TILT = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3'];

interface FriendsBlockProps {
  lang: string;
  t: (key: string) => string;
  showAvatars: boolean;
}

/** A live room in miniature: two players squaring off over a room code. */
export function FriendsBlock({ lang, t, showAvatars }: FriendsBlockProps) {
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

      <div className="flex items-center justify-between gap-2 rounded-2xl border-[3px] border-black bg-neo-navy px-3 py-3 lg:px-6 lg:py-5">
        <div className="flex flex-col items-center gap-1">
          <div className="h-14 w-14 lg:h-20 lg:w-20">
            {showAvatars && <Avatar userId="hp-friend-you" pixelSize={56} mood="emoteCool" className="lg:hidden" />}
            {showAvatars && <Avatar userId="hp-friend-you" pixelSize={80} mood="emoteCool" className="hidden lg:block" />}
          </div>
          <span className="text-[11px] font-bold text-neo-cream lg:text-sm">{t('homeFresh.sections.friends.you')}</span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-[0.2em] text-neo-white/60 uppercase lg:text-xs">
            {t('homeFresh.sections.friends.room')}
          </span>
          <div className="flex gap-1.5" dir="ltr">
            {ROOM_CODE.map((ch, i) => (
              <span
                key={ch}
                className={`flex h-9 w-8 items-center justify-center rounded-lg border-[3px] border-black bg-neo-cream font-neo-display text-lg font-bold text-black shadow-hard-sm lg:h-14 lg:w-12 lg:text-3xl ${TILE_TILT[i]}`}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <div className="h-14 w-14 lg:h-20 lg:w-20">
            {showAvatars && <Avatar userId="hp-friend-maya" pixelSize={56} mood="emoteSilly" className="lg:hidden" />}
            {showAvatars && <Avatar userId="hp-friend-maya" pixelSize={80} mood="emoteSilly" className="hidden lg:block" />}
          </div>
          <span className="text-[11px] font-bold text-neo-cream lg:text-sm">{t('homeFresh.sections.friends.rival')}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2.5">
        <Link
          href={`/${lang}/multiplayer`}
          className="flex-1 rounded-xl border-[3px] border-black bg-black px-4 py-2.5 text-center font-neo-display text-sm font-bold whitespace-nowrap text-neo-pink shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:py-3.5 lg:text-lg"
        >
          {t('homeFresh.sections.friends.cta')}
        </Link>
        <Link
          href={`/${lang}/multiplayer`}
          className="flex-1 rounded-xl border-[3px] border-black bg-neo-cream px-4 py-2.5 text-center font-neo-display text-sm font-bold whitespace-nowrap text-black shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed lg:py-3.5 lg:text-lg"
        >
          {t('homePlay.friendsJoin')}
        </Link>
      </div>
    </section>
  );
}
