'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { Sparkles, Star } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { tr } from '@/components/education/lobby/eduText';
import type { Avatar as AvatarType } from '@/shared/types/game';
import { wordTiles, type FeedPlay, type FeedTarget } from './ProjectorWordcraftFeed';
import type { Translate } from './eduLiveStyles';

const TILE_SPRING = { type: 'spring', stiffness: 520, damping: 20 } as const;

/** The newest move as big letter tiles: the one thing on the wall every student looks up at. */
export function LatestPlay({ play, avatar, language, t }: { play: FeedPlay; avatar?: AvatarType | null; language: string; t: Translate }) {
  const reduceMotion = useReducedMotion();
  const word = play.words[0]?.word ?? '';
  const tiles = wordTiles(word, language);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[4cqh] p-[4cqmin] text-center">
      <span
        className={`inline-flex items-center gap-2 rounded-full border-[3px] border-neo-black px-3 py-1 font-neo-display text-[clamp(0.875rem,3.2cqw,1.75rem)] font-black uppercase text-neo-black shadow-hard-sm ${play.bingo ? 'bg-neo-yellow' : 'bg-neo-cyan'}`}
      >
        <Sparkles className="size-[1.1em]" aria-hidden="true" />
        {play.bingo ? tr(t, 'eduLive.wordcraft.bingo', 'BINGO!') : tr(t, 'wordcraft.encouragement.0', 'Nice word!')}
      </span>
      <div
        key={play.key}
        dir="auto"
        className="flex max-w-full justify-center gap-[1.4cqw]"
        style={{ '--n': Math.max(tiles.length, 4) } as CSSProperties}
      >
        {tiles.map((tile, i) => (
          <m.span
            key={i}
            data-testid="wordcraft-hero-tile"
            initial={reduceMotion ? false : { y: '-70%', scale: 0.4, rotate: -10 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            transition={{ ...TILE_SPRING, delay: reduceMotion ? 0 : i * 0.06 }}
            className="relative grid size-[min(calc(88cqw/var(--n)),34cqh)] place-items-center rounded-neo border-[3px] border-neo-black bg-neo-cream font-neo-display text-[min(calc(52cqw/var(--n)),20cqh)] font-black leading-none text-neo-black shadow-hard"
          >
            {tile.letter}
            {tile.value > 0 && (
              <span className="absolute bottom-[6%] end-[8%] font-neo-body text-[min(calc(16cqw/var(--n)),6cqh)] font-black leading-none">{tile.value}</span>
            )}
          </m.span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-[2cqw] gap-y-2">
        <Avatar avatarImage={avatar?.avatarImage} customAvatar={avatar?.customAvatar ?? undefined} userId={play.username} size="lg" className="border-2 border-neo-black" />
        <bdi className="max-w-[40cqw] truncate font-neo-display text-[clamp(1.25rem,4.5cqw,3rem)] font-black">{play.username}</bdi>
        <span
          key={`score-${play.key}`}
          dir="ltr"
          className="inline-block rounded-neo border-[3px] border-neo-black bg-neo-lime px-3 font-neo-display text-[clamp(1.25rem,4.5cqw,3rem)] font-black tabular-nums text-neo-black shadow-hard-sm motion-safe:animate-score-pop"
        >
          +{play.score}
        </span>
        {play.lessonWord && (
          <span className="inline-flex items-center gap-1.5 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-[clamp(0.875rem,3cqw,1.75rem)] font-black uppercase text-neo-black shadow-hard-sm">
            <Star className="size-[1.1em] fill-current" aria-hidden="true" />
            {tr(t, 'academy.modes.workshop.lessonWord', 'Lesson word!')}
          </span>
        )}
      </div>
    </div>
  );
}

/** Before anyone scores: the round's art and what to build, never an empty frame. */
export function WaitingForFirstWord({ t }: { t: Translate }) {
  return (
    <div data-testid="wordcraft-stage-waiting" className="flex h-full flex-col items-center justify-center gap-[3cqh] p-[4cqmin] text-center">
      <Image src="/mascot/teacher/modes/wordcraft.webp" alt="" width={320} height={320} className="h-[42cqh] w-auto object-contain" />
      <p className="font-neo-display text-[clamp(1.25rem,5cqw,3.25rem)] font-black uppercase leading-tight">
        {tr(t, 'eduLive.wordcraft.waiting', 'Waiting for the first word…')}
      </p>
      <p className="max-w-[36ch] font-neo-body text-[clamp(1rem,2.6cqw,1.75rem)] font-bold text-neo-cream/85">
        {tr(t, 'education.wordcraftLive.tapLetters', 'Tap letters to build a word')}
      </p>
    </div>
  );
}

/** The lesson words as a checklist the class fills together; each tick names who built it first. */
export function LessonWordWall({ targets }: { targets: FeedTarget[] }) {
  const reduceMotion = useReducedMotion();
  return (
    <ul data-testid="wordcraft-targets" className="flex flex-wrap gap-2 md:gap-3">
      {targets.map((x) => (
        <m.li
          key={x.word}
          data-testid={`wordcraft-target-${x.word}`}
          data-built={x.built}
          initial={false}
          animate={x.built && !reduceMotion ? { scale: [1, 1.2, 1] } : { scale: 1 }}
          transition={{ duration: 0.45 }}
          className={
            x.built
              ? 'inline-flex items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-3 py-1.5 font-neo-display text-base font-black text-neo-black shadow-hard-sm md:text-xl 2xl:text-2xl'
              : 'inline-flex items-center rounded-neo border-[3px] border-dashed border-neo-cream/70 px-3 py-1.5 font-neo-display text-base font-black text-neo-cream md:text-xl 2xl:text-2xl'
          }
        >
          <span dir="auto">{x.built ? `✓ ${x.word}` : x.word}</span>
          {x.built && x.by && (
            <bdi className="max-w-[10ch] truncate rounded-full bg-neo-black px-2 font-neo-body text-sm font-bold text-neo-cream md:text-base">{x.by}</bdi>
          )}
        </m.li>
      ))}
    </ul>
  );
}
