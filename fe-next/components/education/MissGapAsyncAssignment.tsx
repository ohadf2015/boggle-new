/**
 * Async miss-gap homework — Kahootopia Assignments foil.
 *
 * Teacher picks a due date, assigns the #972 miss-gap practice card (NOT a live
 * Unplugged session). Students open the homework link, practise, mark complete;
 * on-time completion feeds the class streak.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, Check, ClipboardList, Flame, GraduationCap, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MissGapPracticeCard } from '@/components/education/MissGapPracticeCard';
import {
  buildMissGapClassKey,
  buildMissGapAssignmentGoogleClassroomUrl,
  buildMissGapAssignmentShareUrl,
  defaultMissGapDueDate,
  normalizeDueDate,
  toMissGapAssignmentPayload,
  type MissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import {
  readClassStreak,
  recordClassHomeworkCompletion,
} from '@/lib/education/classStreak';
import { shareWithFallback } from '@/utils/shareWithFallback';

export interface MissGapAsyncAssignmentProps {
  payload: MissGapAssignmentPayload;
  /** Teacher composer (due date + assign). Default: true when due is empty. */
  teacherMode?: boolean;
}

export function MissGapAsyncAssignment({
  payload: initial,
  teacherMode,
}: MissGapAsyncAssignmentProps) {
  const { t, language } = useLanguage();
  const [dueDate, setDueDate] = useState(
    () => initial.dueDate || defaultMissGapDueDate(),
  );
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState(() =>
    readClassStreak(buildMissGapClassKey(initial)),
  );

  const isTeacher = teacherMode ?? !initial.dueDate;
  const locale = initial.locale || language;

  const payload = useMemo(
    () =>
      toMissGapAssignmentPayload({
        ...initial,
        dueDate: normalizeDueDate(dueDate),
      }),
    [initial, dueDate],
  );

  const classKey = buildMissGapClassKey(payload);
  const words = payload.missedWords;
  const lesson = payload.lesson || t('education.results.title');

  const googleClassroomHref = useMemo(() => {
    if (words.length === 0 || !payload.dueDate) return null;
    try {
      const missed = words.slice(0, 8).join(', ');
      return buildMissGapAssignmentGoogleClassroomUrl({
        input: payload,
        title: t('education.results.assignMissGapAsyncTitle', { lesson }),
        body: t('education.results.assignMissGapAsyncBody', {
          missed,
          due: payload.dueDate,
        }),
      });
    } catch {
      return null;
    }
  }, [words, payload, t, lesson]);

  const handleShare = async () => {
    if (words.length === 0 || !payload.dueDate) return;
    const url = buildMissGapAssignmentShareUrl(payload);
    const text = t('education.results.assignMissGapAsyncShareText', {
      lesson,
      missed: words.join(', '),
      due: payload.dueDate,
    });
    const result = await shareWithFallback({
      title: t('education.results.assignMissGapAsyncTitle', { lesson }),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  const handleComplete = () => {
    if (!payload.dueDate || words.length === 0) return;
    const next = recordClassHomeworkCompletion({
      classKey,
      dueDate: payload.dueDate,
    });
    setStreak(next);
    setCompleted(true);
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="miss-gap-async-assignment"
        className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard text-center"
      >
        <p className="text-neo-white font-neo-body mb-4">{t('education.results.allFound')}</p>
        <Link
          href={`/${locale}/education`}
          className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard"
        >
          {t('education.results.shareGapCta')}
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="miss-gap-async-assignment"
      className="w-full max-w-xl flex flex-col gap-4"
    >
      <section className="p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard">
        <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
          {t('education.results.assignMissGapAsyncEyebrow')}
        </p>
        <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">
          {t('education.results.assignMissGapAsyncHeading')}
        </h1>
        <p className="text-neo-white/80 font-neo-body text-sm mt-3">
          {t('education.results.assignMissGapAsyncSubtitle')}
        </p>
        <p
          className="text-neo-lime/90 font-neo-body text-xs mt-2"
          data-testid="miss-gap-async-foil"
        >
          {t('education.results.assignMissGapAsyncFoil')}
        </p>

        <div className="mt-4 flex items-center gap-2 text-neo-white/90 text-sm">
          <Flame className="w-4 h-4 text-neo-pink" aria-hidden />
          <span data-testid="miss-gap-class-streak">
            {t('education.results.assignMissGapAsyncStreak', {
              streak: streak.currentStreak,
            })}
          </span>
        </div>

        {isTeacher ? (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="flex items-center gap-2 text-neo-white font-bold text-sm mb-2">
                <Calendar className="w-4 h-4" aria-hidden />
                {t('education.results.assignMissGapAsyncDueLabel')}
              </span>
              <input
                type="date"
                data-testid="miss-gap-async-due-date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-neo border-neo border-neo-black bg-neo-navy text-neo-white font-neo-body"
              />
            </label>

            {googleClassroomHref ? (
              <a
                href={googleClassroomHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="assign-miss-gap-async-google-classroom"
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
                  'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
                  'shadow-hard hover:shadow-hard-lg transition-all',
                )}
              >
                <GraduationCap className="w-5 h-5" aria-hidden />
                {t('education.results.assignMissGapAsyncGoogleClassroom')}
              </a>
            ) : null}

            <button
              type="button"
              data-testid="share-miss-gap-async-homework"
              onClick={handleShare}
              disabled={!payload.dueDate}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
                'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
                'shadow-hard-sm hover:shadow-hard transition-all',
                !payload.dueDate && 'opacity-50 cursor-not-allowed',
              )}
            >
              {shareState === 'idle' ? (
                <>
                  <Share2 className="w-5 h-5" aria-hidden />
                  {t('education.results.assignMissGapAsyncShare')}
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" aria-hidden />
                  {t('education.results.assignMissGapAsyncShareCopied')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <p
              className="flex items-center gap-2 text-neo-cream font-bold text-sm"
              data-testid="miss-gap-async-due-banner"
            >
              <ClipboardList className="w-4 h-4" aria-hidden />
              {t('education.results.assignMissGapAsyncDueBanner', {
                due: payload.dueDate,
              })}
            </p>
            <button
              type="button"
              data-testid="miss-gap-async-complete"
              onClick={handleComplete}
              disabled={completed}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
                'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
                'shadow-hard hover:shadow-hard-lg transition-all',
                completed && 'opacity-80',
              )}
            >
              <Check className="w-5 h-5" aria-hidden />
              {completed
                ? t('education.results.assignMissGapAsyncCompleted')
                : t('education.results.assignMissGapAsyncComplete')}
            </button>
          </div>
        )}
      </section>

      <MissGapPracticeCard payload={payload} />
    </div>
  );
}
