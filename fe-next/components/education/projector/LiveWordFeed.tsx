'use client';

import { memo } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import type { Avatar as PlayerAvatar } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { maskWord, type LiveFeedEntry } from './liveRoundWords';

export type FeedAvatars = ReadonlyMap<string, PlayerAvatar | null | undefined>;

interface LiveWordFeedProps {
  entries: readonly LiveFeedEntry[];
  avatars?: FeedAvatars;
  reduceMotion: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const TILE = 'grid size-[clamp(18px,min(6.4cqw,4.4cqh),48px)] shrink-0 place-items-center rounded-[4px] border-2 border-neo-black bg-neo-cream font-neo-display text-[clamp(12px,min(4.4cqw,3cqh),32px)] font-black leading-none text-neo-black shadow-hard-sm';

/** Each word drops in with its finder; ordinary words stay masked so the wall never hands out the board. */
export const LiveWordFeed = memo(function LiveWordFeed({ entries, avatars, reduceMotion, t }: LiveWordFeedProps) {
  if (!entries.length) {
    return (
      <div data-testid="live-feed-empty" className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(6px,1.4cqh,18px)] rounded-neo border-[3px] border-dashed border-neo-cream/50 bg-neo-navy px-3 text-center">
        <span aria-hidden className="flex gap-[clamp(3px,0.8cqw,10px)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 140}ms` }}
              className="size-[clamp(18px,min(8cqw,6cqh),56px)] rounded-neo border-[3px] border-dashed border-neo-cream/60 bg-neo-purple/25 motion-safe:animate-[edu-ghost-wave_2.4s_cubic-bezier(0.45,0,0.55,1)_infinite]"
            />
          ))}
        </span>
        <p className="font-neo-display font-black uppercase text-neo-cream text-[clamp(16px,min(6.5cqw,4.4cqh),40px)]">{t('tvBroadcast.wordDropEmpty')}</p>
        <p className="max-w-[30ch] font-neo-body font-bold text-neo-cream/85 text-[clamp(13px,min(4.2cqw,2.6cqh),24px)]">{t('tvBroadcast.wordDropEmptyHint')}</p>
      </div>
    );
  }

  return (
    <ul data-testid="live-word-feed" aria-live="off" className="flex min-h-0 flex-1 flex-col flex-wrap content-start gap-[clamp(4px,1cqh,12px)] overflow-hidden">
      <AnimatePresence initial={false}>
        {entries.map((entry, i) => {
          const avatar = avatars?.get(entry.username);
          return (
            <m.li
              key={entry.id}
              layout={!reduceMotion}
              data-testid="live-feed-row"
              data-name={entry.username}
              data-lesson={entry.lesson ? 'true' : 'false'}
              initial={reduceMotion ? false : { y: -36, scale: 0.85 }}
              animate={{ y: 0, scale: 1 }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 460, damping: 24 }}
              className={cn(
                'flex w-full shrink-0 items-center gap-[clamp(6px,2cqw,16px)] rounded-neo border-[3px] px-[clamp(6px,2cqw,16px)] py-[clamp(3px,0.7cqh,10px)] shadow-hard-sm',
                entry.lesson ? 'border-neo-black bg-neo-lime text-neo-black' : 'border-neo-cream/50 bg-neo-navy-light text-neo-cream',
                i > 3 && !entry.lesson && 'brightness-75'
              )}
            >
              <span aria-hidden className="size-[clamp(28px,min(10cqw,6.5cqh),68px)] shrink-0 overflow-hidden rounded-full border-[3px] border-neo-cream bg-neo-navy">
                <Avatar
                  userId={entry.username}
                  avatarImage={avatar?.avatarImage}
                  customAvatar={(avatar?.customAvatar as CustomAvatarConfig | undefined) ?? undefined}
                  disableEffects
                  className="!h-full !w-full"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[clamp(2px,0.5cqh,6px)]">
                <bdi className="break-words font-neo-display font-black leading-tight text-[clamp(16px,min(6.6cqw,4cqh),40px)] [overflow-wrap:anywhere]">
                  {entry.username}
                </bdi>
                {entry.lesson ? (
                  <span className="flex items-center gap-[0.3em] font-neo-display font-black uppercase leading-none text-[clamp(16px,min(7cqw,4.4cqh),44px)]">
                    <BookOpen className="size-[0.85em] shrink-0" aria-hidden />
                    <bdi className="[overflow-wrap:anywhere]">{entry.word}</bdi>
                  </span>
                ) : (
                  <span dir="auto" className="flex flex-wrap items-center gap-[clamp(2px,0.6cqw,6px)]">
                    {maskWord(entry.word).map((letter, k) => (
                      <span key={k} data-testid="live-feed-tile" className={cn(TILE, !letter && 'bg-neo-purple')}>
                        {letter}
                      </span>
                    ))}
                    <span className="sr-only">{t('tvBroadcast.wordDropLetters', { count: Array.from(entry.word).length })}</span>
                  </span>
                )}
              </span>
            </m.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
});

export default LiveWordFeed;
