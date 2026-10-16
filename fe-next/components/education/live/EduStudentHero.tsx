'use client';

import { memo, type ReactNode } from 'react';
import Image from 'next/image';
import { BookOpenCheck, Coins, Crown, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { MASCOT_SRC, mascotFor, type RivalGap } from '@/components/multiplayer/results/mpResultsView';
import type { Translate } from './eduLiveStyles';

export interface EduStudentHeroProps {
  rank: number;
  total: number;
  score: number;
  bestWord: { word: string; score: number } | null;
  /** Lesson words I found; absent for a late joiner. */
  lesson: { found: number; total: number } | null;
  xp: number | null;
  coins: number | null;
  gap: RivalGap | null;
  reduceMotion: boolean;
  t: Translate;
}

/** Gold for first, cyan for the rest of the podium, cream for everyone else: the card's colour is the placing. */
function fillFor(rank: number, score: number): string {
  if (score <= 0) return 'bg-neo-cream';
  if (rank === 1) return 'bg-neo-yellow';
  return rank <= 3 ? 'bg-neo-cyan' : 'bg-neo-cream';
}

function headlineKey(rank: number, total: number, score: number): string {
  if (score <= 0 || total < 2) return 'education.results.you.roundComplete';
  if (rank === 1) return 'education.results.you.won';
  return rank <= 3 ? 'education.results.you.podium' : 'education.results.you.finished';
}

function gapLine(gap: RivalGap, t: Translate): string {
  if (gap.kind === 'tied') {
    return gap.more > 0 ? t('mpUi.results.tiedWithMore', { name: gap.name, more: gap.more }) : t('mpUi.results.tiedWith', { name: gap.name });
  }
  return gap.kind === 'ahead' ? t('mpUi.results.ahead', { points: gap.points, name: gap.name }) : t('mpUi.results.behind', { points: gap.points, name: gap.name });
}

const CHIP = 'inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border-[3px] border-neo-black px-2.5 py-1 font-neo-display text-sm font-black shadow-hard-sm motion-safe:animate-[edu-live-pop_260ms_cubic-bezier(0.34,1.56,0.64,1)_both]';

/** "Where did I land": my placing, my points counting up, my best word and what I earned, on one card I can read at arm's length. */
function EduStudentHeroImpl({ rank, total, score, bestWord, lesson, xp, coins, gap, reduceMotion, t }: EduStudentHeroProps) {
  const shown = useCountUp({ target: score, duration: 1100, startDelay: 200, immediate: reduceMotion });
  const mood = score <= 0 ? 'cheer' : mascotFor(rank, total, score);
  const chips: { id: string; fill: string; body: ReactNode }[] = [];
  if (bestWord) {
    chips.push({
      id: 'edu-student-best-word',
      fill: 'bg-neo-lime',
      body: (
        <>
          <Star className="size-4 shrink-0 fill-neo-black" aria-hidden="true" />
          <span className="shrink-0 font-neo-body text-xs uppercase tracking-wide">{t('mpUi.results.bestWord')}</span>
          <span dir="auto" className="min-w-0 truncate uppercase">{bestWord.word}</span>
          <span dir="ltr" className="shrink-0 tabular-nums">+{bestWord.score}</span>
        </>
      ),
    });
  }
  if (lesson && lesson.total > 0) {
    chips.push({
      id: 'edu-student-lesson',
      fill: 'bg-neo-white',
      body: (
        <>
          <BookOpenCheck className="size-4 shrink-0" aria-hidden="true" />
          {t('education.results.you.words', { found: lesson.found, total: lesson.total })}
        </>
      ),
    });
  }
  if (xp != null && xp > 0) {
    chips.push({ id: 'edu-student-xp', fill: 'bg-neo-purple', body: <><Sparkles className="size-4 shrink-0" aria-hidden="true" />{t('mpUi.results.xp', { xp })}</> });
  }
  if (coins != null && coins > 0) {
    chips.push({ id: 'edu-student-coins', fill: 'bg-neo-orange', body: <><Coins className="size-4 shrink-0" aria-hidden="true" />{t('mpUi.results.coins', { coins })}</> });
  }

  return (
    <section
      data-testid="edu-student-hero"
      className={cn('relative w-full overflow-hidden rounded-neo-lg border-4 border-neo-black p-4 text-neo-black shadow-hard-lg', fillFor(rank, score))}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            data-testid="edu-student-headline"
            className="inline-flex -rotate-2 rounded-neo bg-neo-navy px-2.5 py-1 font-neo-display text-sm font-black uppercase tracking-wide text-neo-lime shadow-hard-sm"
          >
            {t(headlineKey(rank, total, score))}
          </p>
          {/* "#1 of 1" on zero points is not a placing. */}
          {score > 0 && total > 1 && (
            <p data-testid="edu-student-rank" className="mt-3 font-neo-display text-4xl font-black leading-none tabular-nums sm:text-5xl">
              {t('eduLiveRoom.studentResults.rankOf', { rank, total })}
            </p>
          )}
          <p className="mt-1.5 flex items-baseline gap-1.5 font-neo-body text-lg font-bold">
            <span data-testid="edu-student-score" className="font-neo-display text-3xl font-black tabular-nums">
              <span aria-hidden="true">{shown.toLocaleString()}</span>
              <span className="sr-only">{score}</span>
            </span>
            {t('eduLiveRoom.studentResults.points')}
          </p>
        </div>
        <Image
          src={MASCOT_SRC[mood]}
          alt=""
          width={192}
          height={192}
          className="size-24 shrink-0 select-none object-contain drop-shadow-[3px_3px_0_#000] motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite]"
        />
      </div>

      {gap && (
        <p data-testid="edu-student-gap" dir="auto" className="mt-3 flex items-center gap-1.5 font-neo-body text-sm font-bold">
          {gap.kind === 'behind' ? (
            <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
          ) : gap.kind === 'ahead' ? (
            <Crown className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <Users className="size-4 shrink-0" aria-hidden="true" />
          )}
          <span className="min-w-0">{gapLine(gap, t)}</span>
        </p>
      )}

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <span key={chip.id} data-testid={chip.id} className={cn(CHIP, chip.fill, 'text-neo-black')} style={{ animationDelay: `${300 + i * 90}ms` }}>
              {chip.body}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export const EduStudentHero = memo(EduStudentHeroImpl);
EduStudentHero.displayName = 'EduStudentHero';
