'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import { Crown, Swords, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { MASCOT_SRC, type RivalGap } from '@/components/multiplayer/results/mpResultsView';
import type { RivalOutcome } from '@/components/education/live/useRival';
import { CelebrationLoop } from './CelebrationLoop';
import { beatReached, verdictLook, type RevealBeat, type StudentVerdict } from './studentReveal';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface StudentRevealHeroProps {
  rank: number;
  total: number;
  score: number;
  verdict: StudentVerdict;
  beat: RevealBeat;
  rival: RivalOutcome | null;
  gap: RivalGap | null;
  reduceMotion: boolean;
  /** The round's chest beat: under the verdict on a win or tie, leading it on a loss. */
  chest?: ReactNode;
  t: Translate;
}

function headlineKey(rank: number, total: number, score: number): string {
  if (score <= 0 || total < 2) return 'education.results.you.roundComplete';
  if (rank === 1) return 'education.results.you.won';
  return rank <= 3 ? 'education.results.you.podium' : 'education.results.you.finished';
}

function rivalLine({ rivalName: name, diff }: RivalOutcome, t: Translate): string {
  if (diff > 0) return t('education.rivals.outcome.won', { name, points: diff });
  return diff < 0 ? t('education.rivals.outcome.lost', { name, points: -diff }) : t('education.rivals.outcome.tied', { name });
}

function gapLine(gap: RivalGap, t: Translate): string {
  if (gap.kind === 'tied') {
    return gap.more > 0 ? t('mpUi.results.tiedWithMore', { name: gap.name, more: gap.more }) : t('mpUi.results.tiedWith', { name: gap.name });
  }
  return gap.kind === 'ahead' ? t('mpUi.results.ahead', { points: gap.points, name: gap.name }) : t('mpUi.results.behind', { points: gap.points, name: gap.name });
}

function VerdictIcon({ rival, gap }: { rival: RivalOutcome | null; gap: RivalGap | null }) {
  const cls = 'size-6 shrink-0';
  if (rival) return rival.won ? <Crown className={cls} aria-hidden="true" /> : <Swords className={cls} aria-hidden="true" />;
  if (gap?.kind === 'behind') return <TrendingUp className={cls} aria-hidden="true" />;
  return gap?.kind === 'ahead' ? <Crown className={cls} aria-hidden="true" /> : <Users className={cls} aria-hidden="true" />;
}

/** Rank climbs from the back of the class to my place, the duel verdict lands as one big line, then the chest opens. */
export function StudentRevealHero({ rank, total, score, verdict, beat, rival, gap, reduceMotion, chest, t }: StudentRevealHeroProps) {
  const climb = useCountUp({ target: Math.max(0, total - rank), duration: 900, startDelay: 150, immediate: reduceMotion });
  const points = useCountUp({ target: score, duration: 900, startDelay: 150, immediate: reduceMotion });
  const judged = beatReached(beat, 'verdict');
  const look = verdictLook(verdict);
  const placed = score > 0 && total > 1;
  const line = rival ? rivalLine(rival, t) : gap ? gapLine(gap, t) : null;

  const verdictRow = line ? (
    <p
      data-testid={rival ? 'edu-student-rival' : 'edu-student-gap'}
      dir="auto"
      className={cn(
        'relative flex items-start gap-2 font-neo-display text-xl font-black leading-tight text-balance sm:text-2xl',
        judged ? 'motion-safe:animate-[edu-live-pop_320ms_cubic-bezier(0.34,1.56,0.64,1)_both]' : 'invisible'
      )}
    >
      <VerdictIcon rival={rival} gap={gap} />
      <span className="min-w-0">{line}</span>
    </p>
  ) : null;
  const chestFirst = verdict === 'lost';

  return (
    <section
      data-testid="edu-student-hero"
      data-verdict={judged ? verdict : 'pending'}
      className={cn(
        'relative flex w-full flex-col gap-2.5 overflow-hidden rounded-neo-lg border-4 border-neo-black p-3 text-neo-black shadow-hard-lg transition-colors duration-300 motion-reduce:transition-none sm:p-4',
        judged ? look.surface : 'bg-neo-cream'
      )}
    >
      <CelebrationLoop active={judged && verdict === 'won'} />
      <div className="relative flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p
            data-testid="edu-student-headline"
            className="inline-flex -rotate-2 rounded-neo bg-neo-navy px-2.5 py-1 font-neo-display text-sm font-black uppercase tracking-wide text-neo-lime shadow-hard-sm"
          >
            {t(headlineKey(rank, total, score))}
          </p>
          {placed && (
            <p data-testid="edu-student-rank" className="mt-1.5 whitespace-nowrap font-neo-display text-[clamp(2rem,10.5vw,4rem)] font-black leading-none tabular-nums">
              <span aria-hidden="true">{t('eduLiveRoom.studentResults.rankOf', { rank: total - climb, total })}</span>
              <span className="sr-only">{t('eduLiveRoom.studentResults.rankOf', { rank, total })}</span>
            </p>
          )}
          <p className="mt-1 flex items-baseline gap-1.5 font-neo-body text-lg font-bold">
            <span data-testid="edu-student-score" className="font-neo-display text-3xl font-black tabular-nums">
              <span aria-hidden="true">{points.toLocaleString()}</span>
              <span className="sr-only">{score}</span>
            </span>
            {t('eduLiveRoom.studentResults.points')}
          </p>
        </div>
        <Image
          src={MASCOT_SRC[judged ? look.mascot : 'cheer']}
          alt=""
          width={192}
          height={192}
          className="size-20 shrink-0 select-none object-contain drop-shadow-[3px_3px_0_rgb(var(--neo-black))] motion-safe:animate-[edu-live-bob_2.4s_ease-in-out_infinite] sm:size-24"
        />
      </div>
      {chestFirst ? (
        <>
          {chest}
          {verdictRow}
        </>
      ) : (
        <>
          {verdictRow}
          {chest}
        </>
      )}
    </section>
  );
}

export default StudentRevealHero;
