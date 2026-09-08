/**
 * Grade receipt / Classroom student attachment view for #975 miss-gap homework.
 *
 * Foils Kahoot Marketplace grade passback: shows pointsEarned/maxPoints after
 * practice complete, with a copyable turn-in receipt. No roster OAuth.
 * Below: parent WhatsApp shareable miss-gap practice card (moat next-layer).
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, GraduationCap, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  buildMissGapAssignmentPath,
  type MissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import {
  buildMissGapGradePassbackShareUrl,
  scoreMissGapHomework,
  type MissGapGradeScore,
} from '@/lib/education/missGapGradePassback';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { MissGapWhatsAppShareCard } from '@/components/education/MissGapWhatsAppShareCard';

export interface MissGapGradePassbackProps {
  payload: MissGapAssignmentPayload;
  /** Precomputed score from query params; recomputed when absent. */
  score?: MissGapGradeScore | null;
}

export function MissGapGradePassback({
  payload,
  score: scoreProp,
}: MissGapGradePassbackProps) {
  const { t, language } = useLanguage();
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');

  const score = useMemo(() => {
    if (scoreProp) return scoreProp;
    if (!payload.dueDate) {
      return scoreMissGapHomework({
        dueDate: '',
        completed: false,
      });
    }
    return scoreMissGapHomework({
      dueDate: payload.dueDate,
      completed: true,
    });
  }, [scoreProp, payload.dueDate]);

  const locale = payload.locale || language;
  const lesson = payload.lesson || t('education.results.title');
  const words = payload.missedWords;
  const homeworkHref = buildMissGapAssignmentPath(payload);

  const handleShareReceipt = async () => {
    if (words.length === 0 || !payload.dueDate) return;
    const url = buildMissGapGradePassbackShareUrl({ input: payload, score });
    const text = t('education.results.missGapGradePassbackShareText', {
      lesson,
      points: score.pointsEarned,
      max: score.maxPoints,
      due: payload.dueDate,
    });
    const result = await shareWithFallback({
      title: t('education.results.missGapGradePassbackTitle', { lesson }),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="miss-gap-grade-passback"
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
    <div className="w-full max-w-xl flex flex-col gap-4" data-testid="miss-gap-grade-passback-stack">
    <div
      data-testid="miss-gap-grade-passback"
      className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard"
    >
      <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.results.missGapGradePassbackEyebrow')}
      </p>
      <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">
        {t('education.results.missGapGradePassbackHeading')}
      </h1>
      <p className="text-neo-white/80 font-neo-body text-sm mt-3">
        {t('education.results.missGapGradePassbackSubtitle')}
      </p>
      <p
        className="text-neo-lime/90 font-neo-body text-xs mt-2"
        data-testid="miss-gap-grade-passback-foil"
      >
        {t('education.results.missGapGradePassbackFoil')}
      </p>

      <div
        className="mt-5 p-4 rounded-neo border-neo border-neo-black bg-neo-navy flex flex-col gap-2"
        data-testid="miss-gap-grade-score"
        data-points={score.pointsEarned}
        data-max={score.maxPoints}
        data-on-time={score.onTime ? '1' : '0'}
        data-post-state={score.postState}
      >
        <div className="flex items-center gap-2 text-neo-cream font-bold text-sm">
          <GraduationCap className="w-4 h-4" aria-hidden />
          {t('education.results.missGapGradePassbackScore', {
            points: score.pointsEarned,
            max: score.maxPoints,
          })}
        </div>
        <p className="text-neo-white/80 font-neo-body text-sm">
          {score.onTime
            ? t('education.results.missGapGradePassbackOnTime')
            : t('education.results.missGapGradePassbackLate')}
        </p>
        {payload.dueDate ? (
          <p className="flex items-center gap-2 text-neo-white/70 text-xs">
            <ClipboardList className="w-3.5 h-3.5" aria-hidden />
            {t('education.results.missGapGradePassbackDue', { due: payload.dueDate })}
          </p>
        ) : null}
      </div>

      <p className="text-neo-white/60 font-neo-body text-xs mt-3" data-testid="miss-gap-grade-privacy">
        {t('education.results.missGapGradePassbackPrivacy')}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <button
          type="button"
          data-testid="miss-gap-grade-copy-receipt"
          onClick={handleShareReceipt}
          disabled={!payload.dueDate}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard hover:shadow-hard-lg transition-all',
            !payload.dueDate && 'opacity-50 cursor-not-allowed',
          )}
        >
          {shareState === 'idle' ? (
            <>
              <Share2 className="w-5 h-5" aria-hidden />
              {t('education.results.missGapGradePassbackCopy')}
            </>
          ) : (
            <>
              <Check className="w-5 h-5" aria-hidden />
              {t('education.results.missGapGradePassbackCopied')}
            </>
          )}
        </button>

        <Link
          href={homeworkHref}
          data-testid="miss-gap-grade-back-homework"
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cyan text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          {t('education.results.missGapGradePassbackBackHomework')}
        </Link>
      </div>
    </div>
      <MissGapWhatsAppShareCard payload={payload} />
    </div>
  );
}
