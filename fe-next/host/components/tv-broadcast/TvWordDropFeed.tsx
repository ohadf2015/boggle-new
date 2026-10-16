'use client';

import { memo } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Flame } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import { chipAccent } from '@/components/education/projector/projectorLobbyModel';

export interface WordDrop {
  id: number;
  username: string;
  length: number;
  comboLevel: number;
}

export const FEED_ROWS = 6;
const LONG_WORD = 6;

interface TvWordDropFeedProps {
  drops: WordDrop[];
  totalWords: number;
  avgLength: string;
  longest: number;
  t: (path: string, params?: Record<string, string | number>) => string;
}

function Stat({ id, label, value, accent }: { id: string; label: string; value: string | number; accent: string }) {
  return (
    <div data-testid={`word-drop-stat-${id}`} className="flex flex-col items-center gap-1">
      <span className="text-sm 2xl:text-base font-black uppercase tracking-widest text-neo-cream/70">{label}</span>
      <span className={cn('font-neo-display text-4xl 2xl:text-6xl font-black leading-none tabular-nums', accent)}>{value}</span>
    </div>
  );
}

// The wall sees who scored and how long the word was — never the letters, which would hand the board to every phone.
export const TvWordDropFeed = memo<TvWordDropFeedProps>(function TvWordDropFeed({ drops, totalWords, avgLength, longest, t }) {
  const reduceMotion = useReducedMotion();
  const shown = drops.slice(-FEED_ROWS).reverse();

  return (
    <div className="flex h-full flex-col">
      {shown.length === 0 ? (
        <div data-testid="word-drop-empty" className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
          <div aria-hidden="true" className="flex gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className="size-12 2xl:size-16 rounded-neo border-3 border-dashed border-neo-cream/40 motion-safe:animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="font-neo-display text-3xl 2xl:text-5xl font-black uppercase text-neo-cream">{t('tvBroadcast.wordDropEmpty')}</p>
          <p className="max-w-[40ch] text-lg 2xl:text-2xl font-bold text-neo-cream/70">{t('tvBroadcast.wordDropEmptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-1 flex-col gap-3 overflow-hidden p-4 2xl:gap-4 2xl:p-6">
          <AnimatePresence initial={false}>
            {shown.map((drop, i) => {
              const long = drop.length >= LONG_WORD;
              return (
                <m.li
                  key={drop.id}
                  layout={!reduceMotion}
                  data-testid="word-drop"
                  initial={reduceMotion ? false : { x: -60, scale: 0.85 }}
                  animate={{ x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  className={cn(
                    'flex items-center gap-4 rounded-neo border-3 border-neo-black bg-neo-navy-light px-4 py-2.5 shadow-hard',
                    i > 2 && 'brightness-75'
                  )}
                >
                  <span className="relative size-12 2xl:size-16 shrink-0 overflow-hidden rounded-full border-3 border-neo-cream bg-neo-navy [&_svg]:h-full [&_svg]:w-full">
                    <Avatar userId={drop.username} size="xl" disableEffects className="!h-full !w-full" />
                  </span>
                  <span
                    className={cn(
                      'min-w-0 max-w-[14ch] truncate rounded-neo border-2 px-3 py-1 font-neo-display text-xl 2xl:text-3xl font-black',
                      chipAccent(drop.username, i)
                    )}
                  >
                    {drop.username}
                  </span>
                  <span aria-hidden="true" className="ms-auto flex gap-1.5">
                    {Array.from({ length: drop.length }, (_, k) => (
                      <span
                        key={k}
                        data-testid="word-drop-tile"
                        className={cn(
                          'size-7 2xl:size-10 rounded-[4px] border-2 border-neo-black shadow-hard-sm',
                          long ? 'bg-neo-lime' : 'bg-neo-cream'
                        )}
                      />
                    ))}
                  </span>
                  <span className="sr-only">{t('tvBroadcast.wordDropLetters', { count: drop.length })}</span>
                  {drop.comboLevel > 0 && (
                    <span
                      data-testid="word-drop-combo"
                      className="inline-flex shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-pink px-2 py-1 font-neo-display text-lg 2xl:text-2xl font-black text-neo-black"
                    >
                      <Flame className="size-5" aria-hidden="true" />x{drop.comboLevel}
                    </span>
                  )}
                </m.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <div className="grid grid-cols-3 border-t-3 border-neo-black bg-neo-navy-elevated px-4 py-4 2xl:py-5">
        <Stat id="total" label={t('tvBroadcast.totalWords')} value={totalWords} accent="text-neo-cream" />
        <Stat id="longest" label={t('tvBroadcast.longestWord')} value={longest} accent="text-neo-lime" />
        <Stat id="avg" label={t('tvBroadcast.avgLength')} value={avgLength} accent="text-neo-cyan" />
      </div>
    </div>
  );
});

export default TvWordDropFeed;
