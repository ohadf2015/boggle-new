/**
 * Shareable miss-gap practice card — take-home after Unplugged Classroom assign.
 *
 * Public surface parents / Slack open. Print / save PDF reuses #957 sheet.
 * Class-level missed words only — no student names.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Printer, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { buildMissGapPracticeShareUrl } from '@/lib/education/missGapPracticeShare';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { buildUnpluggedReteachPath } from '@/lib/education/unpluggedReteachLive';
import { shareWithFallback } from '@/utils/shareWithFallback';

export interface MissGapPracticeCardProps {
  payload: ClassGapSharePayload;
}

export function MissGapPracticeCard({ payload }: MissGapPracticeCardProps) {
  const { t, language } = useLanguage();
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const words = payload.missedWords;
  const locale = payload.locale || language;
  const lesson = payload.lesson || t('education.results.title');

  const handlePrintPdf = () => {
    if (words.length === 0) return;
    openMissedWordsPracticeSheet({
      lesson: payload.lesson,
      teacher: payload.teacher,
      missedWords: words,
      locale,
      labels: {
        title: t('education.results.printPracticeSheetTitle', { lesson }),
        subtitle: t('education.results.printPracticeSheetSubtitle'),
        writeLabel: t('education.results.printPracticeSheetWriteLabel'),
        sentenceLabel: t('education.results.printPracticeSheetSentenceLabel'),
        nameLine: t('education.results.printPracticeSheetNameLine'),
        dateLine: t('education.results.printPracticeSheetDateLine'),
        footer: t('education.results.printPracticeSheetFooter'),
      },
    });
  };

  const handleShare = async () => {
    if (words.length === 0) return;
    const url = buildMissGapPracticeShareUrl(payload);
    const text = t('education.results.shareMissGapPracticeText', {
      lesson,
      missed: words.join(', '),
    });
    const result = await shareWithFallback({
      title: t('education.results.shareMissGapPracticeTitle'),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setShareState(result);
  };

  const unpluggedHref =
    words.length > 0
      ? buildUnpluggedReteachPath({
          locale,
          lessonNames: payload.lesson ? [payload.lesson] : [],
          teacherName: payload.teacher,
          found: payload.found,
          total: payload.total,
          missedWords: words,
        })
      : null;

  if (words.length === 0) {
    return (
      <div
        data-testid="miss-gap-practice-card"
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
    <article
      data-testid="miss-gap-practice-card"
      className="w-full max-w-xl p-6 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard"
    >
      <p className="text-neo-lime font-bold text-xs uppercase tracking-widest mb-2">
        {t('education.results.missGapPracticeEyebrow')}
      </p>
      <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">{lesson}</h1>
      {payload.teacher ? (
        <p className="text-neo-cream font-neo-body text-sm mt-1">{payload.teacher}</p>
      ) : null}
      <p className="text-neo-cream font-neo-body text-sm mt-3">
        {t('education.results.missGapPracticeSubtitle')}
      </p>
      {/* One card style on this surface: a solid fill with a 3px edge. The
          words used to sit in a 10%-pink tint behind a 1px pink/40 line — a
          content card separated from its parent by colour alone, which the
          design rules rule out and which read as a highlight, not a card. */}
      <div className="mt-4 p-3 rounded-neo border-[3px] border-neo-cream bg-neo-navy">
        <p className="text-neo-white font-bold text-sm mb-2">
          {t('education.results.shareGapPracticeHome')}
        </p>
        <ul className="flex flex-wrap gap-2" data-testid="miss-gap-practice-words">
          {words.map((word) => (
            <li
              key={word}
              className="px-3 py-1.5 rounded-neo border-[3px] border-neo-cream bg-neo-navy text-neo-white font-bold text-sm"
            >
              {word}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        data-testid="miss-gap-practice-print-pdf"
        onClick={handlePrintPdf}
        className={cn(
          'mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
          'bg-neo-cream text-neo-black border-[3px] border-neo-black rounded-neo',
          'shadow-hard hover:shadow-hard-lg transition-all',
        )}
      >
        <Printer className="w-5 h-5" aria-hidden />
        {t('education.results.missGapPracticePrintPdf')}
      </button>

      <button
        type="button"
        data-testid="miss-gap-practice-share"
        onClick={handleShare}
        className={cn(
          'mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
          'bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo',
          'shadow-hard-sm hover:shadow-hard transition-all',
        )}
      >
        {shareState === 'idle' ? (
          <>
            <Share2 className="w-5 h-5" aria-hidden />
            {t('education.results.shareMissGapPractice')}
          </>
        ) : (
          <>
            <Check className="w-5 h-5" aria-hidden />
            {t('education.results.shareMissGapPracticeCopied')}
          </>
        )}
      </button>

      {unpluggedHref ? (
        <Link
          href={unpluggedHref}
          data-testid="miss-gap-practice-open-unplugged"
          className={cn(
            'mt-2 w-full flex items-center justify-center gap-2 px-4 py-2.5 font-bold text-sm',
            'bg-neo-cyan text-neo-black border-[3px] border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          {t('education.results.startUnpluggedReteachLive')}
        </Link>
      ) : null}
    </article>
  );
}
