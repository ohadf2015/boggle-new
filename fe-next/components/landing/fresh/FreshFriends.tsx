'use client';

import type { CSSProperties } from 'react';
import { Flag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { FreshSection } from './FreshSection';
import s from './FreshMotion.module.css';

/** Display-only sample code (a real room code has the same 4-char shape). */
const ROOM_CODE = 'LX7Q';

interface Racer {
  name: string;
  /** Complete literal Tailwind class (v4 only generates literals). */
  art: string;
  lane: string;
  runner: string;
}

/**
 * The friends visual: a room code typing itself in, then two mascots racing
 * down dashed lanes to the flag. Lanes flip in RTL (`:dir(rtl)` in the CSS).
 * Resting frame = both racers mid-race, "you" just ahead. Racers are CSS
 * backgrounds so a hidden (returning-visitor) fresh tree never fetches them.
 */
function RaceArt({ roomLabel, you, rival }: { roomLabel: string; you: string; rival: string }) {
  const racers: Racer[] = [
    { name: you, art: 'bg-[url(/home/shell/race-you.webp)]', lane: 'bg-neo-pink', runner: s.runner },
    { name: rival, art: 'bg-[url(/home/shell/race-rival.webp)]', lane: 'bg-neo-cyan', runner: cn(s.runner, s.runnerB) },
  ];
  return (
    <div
      data-fresh-art="race"
      aria-hidden="true"
      className={cn(
        'w-full max-w-[340px] rounded-neo-lg border-3 border-neo-pink bg-neo-navy-light p-5 shadow-[6px_6px_0_0_rgb(0_0_0)] md:max-w-[460px] md:p-7',
        s.tiltCardAlt
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-neo-body text-sm font-bold uppercase tracking-wide text-neo-cream/70">{roomLabel}</span>
        <span data-room-code={ROOM_CODE} dir="ltr" className="flex gap-1">
          {ROOM_CODE.split('').map((ch, i) => (
            <span
              key={i}
              style={{ '--i': i } as CSSProperties}
              className={cn(
                'flex h-9 w-8 items-center justify-center rounded-[6px] border-2 border-neo-black bg-neo-cream',
                'font-neo-display text-xl font-bold text-neo-black shadow-hard-sm',
                s.codeChar
              )}
            >
              {ch}
            </span>
          ))}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {racers.map((r) => (
          <div key={r.art} data-race-lane className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-neo-display text-sm font-bold text-neo-cream">
              <span className={cn('h-2.5 w-2.5 rounded-full border-2 border-neo-black', r.lane)} />
              {r.name}
            </span>
            <div className="relative flex h-16 items-center border-b-2 border-dashed border-neo-cream/30">
              <Flag
                className="absolute end-0 bottom-1 h-6 w-6 fill-neo-lime text-neo-black"
                strokeWidth={2.5}
              />
              <div className={cn('absolute inset-x-0 bottom-0', s.lane)}>
                <div className={cn('aspect-square w-14 bg-contain bg-center bg-no-repeat', r.art, r.runner)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Section 3: live rooms with friends → /multiplayer. */
export function FreshFriends() {
  const { t, language } = useLanguage();
  return (
    <FreshSection
      id="friends"
      accent="pink"
      flip
      title={t('homeFresh.sections.friends.title')}
      line={t('homeFresh.sections.friends.line')}
      link={{ href: `/${language}/multiplayer`, label: t('homeFresh.sections.friends.cta') }}
      art={
        <RaceArt
          roomLabel={t('homeFresh.sections.friends.room')}
          you={t('homeFresh.sections.friends.you')}
          rival={t('homeFresh.sections.friends.rival')}
        />
      }
    />
  );
}
