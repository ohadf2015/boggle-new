/**
 * Teacher's side of async homework: who actually played, and how they did.
 *
 * Before this the assignment card could only say "assigned". The teacher had no
 * way to know whether anyone opened the link, so the follow-up lesson was a
 * guess. Blooket's homework tab answers "how many plays"; this answers the more
 * useful question — WHICH student, how many words, how long, on time or late.
 *
 * The named list only comes back for a signed-in caller (the API enforces it),
 * so a student holding the same share link sees counts and nothing else.
 */
'use client';

import { Star, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MissGapStreakFlame } from './MissGapStreakFlame';
import type { MissGapProgressState } from './useMissGapProgress';

export type { MissGapProgressRun, MissGapProgressData } from './useMissGapProgress';

export interface MissGapTeacherProgressProps extends MissGapProgressState {}

export function MissGapTeacherProgress({ data, failed }: MissGapTeacherProgressProps) {
  const { t } = useLanguage();

  const runs = data?.runs ?? [];

  return (
    <section
      data-testid="miss-gap-teacher-progress"
      className="p-4 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard"
    >
      <p className="text-neo-cyan font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.homework.teacherEyebrow')}
      </p>

      <MissGapStreakFlame streak={data?.streak?.currentStreak ?? 0} size="hero" />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <p className="rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2">
          <span className="flex items-center gap-1.5 font-neo-display font-bold text-2xl text-neo-white">
            <Users className="w-5 h-5 text-neo-cyan" aria-hidden />
            <span data-testid="miss-gap-teacher-players">{data?.players ?? 0}</span>
          </span>
          <span className="block font-neo-body text-[11px] uppercase tracking-wider text-neo-white/70">
            {t('education.homework.teacherPlayed')}
          </span>
        </p>
        <p className="rounded-neo border-2 border-neo-black bg-neo-navy px-3 py-2">
          <span className="block font-neo-display font-bold text-2xl text-neo-lime">
            {data?.averageAccuracy ?? 0}%
          </span>
          <span className="block font-neo-body text-[11px] uppercase tracking-wider text-neo-white/70">
            {t('education.homework.teacherAverage')}
          </span>
        </p>
      </div>

      {failed ? (
        <p className="mt-3 font-neo-body text-sm text-neo-pink">
          {t('education.homework.teacherLoadFailed')}
        </p>
      ) : runs.length === 0 ? (
        <p
          data-testid="miss-gap-teacher-empty"
          className="mt-3 font-neo-body text-sm text-neo-white/70"
        >
          {t('education.homework.teacherEmpty')}
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pe-1">
          {runs.map((run, i) => (
            <li
              key={`${run.name}-${i}`}
              data-testid="miss-gap-teacher-run"
              className="flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-navy"
            >
              <span className="flex-1 min-w-0 truncate font-neo-display font-bold text-neo-white text-sm">
                {run.name || t('education.homework.anonStudent')}
              </span>
              <span className="font-neo-body text-xs text-neo-white/70 tabular-nums">
                {run.wordsCorrect}/{run.wordsTotal}
              </span>
              <span className="flex items-center" aria-hidden>
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      'w-4 h-4',
                      n <= run.stars
                        ? 'fill-neo-yellow text-neo-black'
                        : 'fill-transparent text-neo-white/25',
                    )}
                  />
                ))}
              </span>
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded border-2 border-neo-black text-[10px] font-bold uppercase',
                  run.onTime ? 'bg-neo-lime text-neo-black' : 'bg-neo-orange text-neo-black',
                )}
              >
                {run.onTime
                  ? t('education.homework.teacherOnTime')
                  : t('education.homework.teacherLate')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
