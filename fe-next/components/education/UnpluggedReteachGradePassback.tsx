/**
 * Grade receipt / Classroom teacher attachment view for Unplugged reteach Live.
 *
 * Foils Kahoot Classroom add-on grade passback: shows cleared/total → points
 * after Live finish, with a copyable turn-in receipt. No roster OAuth.
 * Below: parent WhatsApp shareable miss-gap practice card (#980).
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ClipboardList, GraduationCap, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { buildUnpluggedReteachPath } from '@/lib/education/unpluggedReteachLive';
import {
  buildUnpluggedGradePassbackShareUrl,
  scoreUnpluggedReteach,
  type UnpluggedGradeScore,
} from '@/lib/education/unpluggedReteachGradePassback';
import { toMissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { MissGapWhatsAppShareCard } from '@/components/education/MissGapWhatsAppShareCard';

export interface UnpluggedReteachGradePassbackProps {
  payload: ClassGapSharePayload;
  score?: UnpluggedGradeScore | null;
  dueDate?: string;
}

export function UnpluggedReteachGradePassback({
  payload,
  score: scoreProp,
  dueDate,
}: UnpluggedReteachGradePassbackProps) {
  const { t, language } = useLanguage();
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');

  const score = useMemo(() => {
    if (scoreProp) return scoreProp;
    return scoreUnpluggedReteach({
      cleared: payload.missedWords.length,
      total: payload.missedWords.length,
      dueDate: dueDate || undefined,
      completed: payload.missedWords.length > 0,
    });
  }, [scoreProp, payload.missedWords.length, dueDate]);

  const locale = payload.locale || language;
  const lesson = payload.lesson || t('education.results.title');
  const words = payload.missedWords;
  const liveHref = buildUnpluggedReteachPath(payload);

  const missGapPayload = useMemo(
    () =>
      toMissGapAssignmentPayload({
        locale: payload.locale,
        lessonNames: payload.lesson ? [payload.lesson] : [],
        teacherName: payload.teacher || '',
        found: payload.found,
        total: payload.total,
        missedWords: payload.missedWords,
        dueDate: dueDate || score.dueDate || '',
      }),
    [payload, dueDate, score.dueDate],
  );

  const handleShareReceipt = async () => {
    if (words.length === 0) return;
    const url = buildUnpluggedGradePassbackShareUrl({
      input: payload,
      score,
      dueDate: dueDate || score.dueDate,
    });
    const text = t('education.results.unpluggedGradePassbackShareText', {
      lesson,
      points: score.pointsEarned,
      max: score.maxPoints,
      cleared: score.cleared,
      total: score.total,
    });
    const result = await shareWithFallback({
      title: t('education.results.unpluggedGradePassbackTitle', { lesson }),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="unplugged-grade-passback"
        className="w-full max-w-xl p-6 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard text-center"
      >
        <p className="text-neo-white font-neo-body mb-4">{t('education.results.allFound')}</p>
        <Link
          href={`/${locale}/education`}
          className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo shadow-hard"
        >
          {t('education.results.shareGapCta')}
        </Link>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-xl flex flex-col gap-4 lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-start lg:content-start lg:gap-5"
      data-testid="unplugged-grade-passback-stack"
    >
      <div
        data-testid="unplugged-grade-passback"
        className="w-full max-w-xl p-6 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard"
      >
        <p className="text-neo-lime font-bold text-xs uppercase tracking-widest mb-2">
          {t('education.results.unpluggedGradePassbackEyebrow')}
        </p>
        <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">
          {t('education.results.unpluggedGradePassbackHeading')}
        </h1>
        <p className="text-neo-cream font-neo-body text-sm mt-3">
          {t('education.results.unpluggedGradePassbackSubtitle')}
        </p>

        <div
          className="mt-5 p-4 rounded-neo border-[3px] border-neo-cream bg-neo-navy flex flex-col gap-2"
          data-testid="unplugged-grade-score"
          data-points={score.pointsEarned}
          data-max={score.maxPoints}
          data-on-time={score.onTime ? '1' : '0'}
          data-post-state={score.postState}
          data-cleared={score.cleared}
          data-total={score.total}
          data-accuracy={score.accuracy}
        >
          <div className="flex items-center gap-2 text-neo-cream font-bold text-sm">
            <GraduationCap className="w-4 h-4" aria-hidden />
            {t('education.results.unpluggedGradePassbackScore', {
              points: score.pointsEarned,
              max: score.maxPoints,
            })}
          </div>
          <p className="text-neo-cream font-neo-body text-sm">
            {t('education.results.unpluggedGradePassbackCleared', {
              cleared: score.cleared,
              total: score.total,
              accuracy: score.accuracy,
            })}
          </p>
          <p className="text-neo-cream font-neo-body text-sm">
            {score.onTime
              ? t('education.results.unpluggedGradePassbackOnTime')
              : t('education.results.unpluggedGradePassbackLate')}
          </p>
          {score.dueDate ? (
            <p className="flex items-center gap-2 text-neo-cream text-xs">
              <ClipboardList className="w-3.5 h-3.5" aria-hidden />
              {t('education.results.unpluggedGradePassbackDue', { due: score.dueDate })}
            </p>
          ) : null}
        </div>

        <p
          className="text-neo-cream font-neo-body text-xs mt-3"
          data-testid="unplugged-grade-privacy"
        >
          {t('education.results.unpluggedGradePassbackPrivacy')}
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            data-testid="unplugged-grade-copy-receipt"
            onClick={handleShareReceipt}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
              'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
              'shadow-hard hover:shadow-hard-lg transition-all',
            )}
          >
            {shareState === 'idle' ? (
              <>
                <Share2 className="w-5 h-5" aria-hidden />
                {t('education.results.unpluggedGradePassbackCopy')}
              </>
            ) : (
              <>
                <Check className="w-5 h-5" aria-hidden />
                {t('education.results.unpluggedGradePassbackCopied')}
              </>
            )}
          </button>

          <Link
            href={liveHref}
            data-testid="unplugged-grade-back-live"
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
              'bg-neo-cream text-neo-black border-[3px] border-neo-black rounded-neo',
              'shadow-hard-sm hover:shadow-hard transition-all',
            )}
          >
            {t('education.results.unpluggedGradePassbackBackLive')}
          </Link>
        </div>
      </div>
      <MissGapWhatsAppShareCard payload={missGapPayload} />
    </div>
  );
}
