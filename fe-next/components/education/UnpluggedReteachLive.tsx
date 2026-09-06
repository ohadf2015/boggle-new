/**
 * Teacher projector UI for unplugged reteach Live.
 *
 * One missed word at a time on the teacher screen; students write on the #957
 * printable practice sheet. No multiplayer room / no student devices.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Eye, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';

export interface UnpluggedReteachLiveProps {
  payload: ClassGapSharePayload;
  /** Optional education home fallback when empty. */
  educationHref?: string;
}

export function UnpluggedReteachLive({
  payload,
  educationHref,
}: UnpluggedReteachLiveProps) {
  const { t, language } = useLanguage();
  const words = payload.missedWords;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const safeIndex = words.length === 0 ? 0 : Math.min(index, words.length - 1);
  const current = words[safeIndex] ?? '';
  const homeHref = educationHref || `/${payload.locale || language}/education`;

  const progressLabel = useMemo(
    () =>
      t('education.results.unpluggedReteachProgress', {
        current: words.length === 0 ? 0 : safeIndex + 1,
        total: words.length,
      }),
    [t, words.length, safeIndex],
  );

  const handleReveal = () => setRevealed(true);

  const handlePrev = () => {
    if (safeIndex <= 0) return;
    setIndex(safeIndex - 1);
    setRevealed(false);
  };

  const handleNext = () => {
    if (safeIndex >= words.length - 1) return;
    setIndex(safeIndex + 1);
    setRevealed(false);
  };

  const handlePrint = () => {
    if (words.length === 0) return;
    openMissedWordsPracticeSheet({
      lesson: payload.lesson,
      teacher: payload.teacher,
      missedWords: words,
      locale: payload.locale || language,
      labels: {
        title: t('education.results.printPracticeSheetTitle', {
          lesson: payload.lesson,
        }),
        subtitle: t('education.results.printPracticeSheetSubtitle'),
        writeLabel: t('education.results.printPracticeSheetWriteLabel'),
        sentenceLabel: t('education.results.printPracticeSheetSentenceLabel'),
        nameLine: t('education.results.printPracticeSheetNameLine'),
        dateLine: t('education.results.printPracticeSheetDateLine'),
        footer: t('education.results.printPracticeSheetFooter'),
      },
    });
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="unplugged-reteach-live"
        className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
      >
        <div className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard text-center">
          <p className="text-neo-white font-neo-body mb-4">
            {t('education.results.allFound')}
          </p>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard"
          >
            {t('education.results.shareGapCta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="unplugged-reteach-live"
      className="min-h-dvh bg-neo-navy flex items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-3xl p-6 sm:p-10 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard">
        <p className="text-neo-pink font-bold text-xs uppercase tracking-widest mb-2">
          {t('education.results.startUnpluggedReteachLive')}
        </p>
        <h1 className="text-neo-white font-neo-display font-bold text-2xl sm:text-3xl leading-tight">
          {payload.lesson || t('education.results.title')}
        </h1>
        {payload.teacher ? (
          <p className="text-neo-white/70 font-neo-body text-sm mt-1">{payload.teacher}</p>
        ) : null}
        <p className="text-neo-lime font-bold mt-4" data-testid="unplugged-reteach-progress">
          {progressLabel}
        </p>
        <p className="text-neo-white/80 font-neo-body text-sm mt-2">
          {t('education.results.unpluggedReteachHint')}
        </p>

        <div
          data-testid="unplugged-reteach-word"
          data-revealed={String(revealed)}
          className={
            'mt-8 min-h-[8rem] sm:min-h-[10rem] flex items-center justify-center ' +
            'rounded-neo border-neo border-neo-black bg-neo-navy px-4 py-8'
          }
        >
          {revealed ? (
            <span className="text-neo-white font-neo-display font-bold text-4xl sm:text-6xl tracking-wide text-center break-all">
              {current}
            </span>
          ) : (
            <span className="text-neo-white/40 font-neo-display font-bold text-3xl sm:text-5xl">
              · · ·
            </span>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
          <button
            type="button"
            data-testid="unplugged-reteach-prev"
            onClick={handlePrev}
            disabled={safeIndex <= 0}
            className={cn(
              'flex items-center justify-center gap-1 px-3 py-3 font-bold text-sm',
              'bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
            {t('education.results.unpluggedReteachPrev')}
          </button>
          <button
            type="button"
            data-testid="unplugged-reteach-reveal"
            onClick={handleReveal}
            disabled={revealed}
            className={cn(
              'flex items-center justify-center gap-1 px-3 py-3 font-bold text-sm',
              'bg-neo-pink text-neo-black border-neo border-neo-black rounded-neo shadow-hard-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            <Eye className="w-4 h-4" aria-hidden />
            {t('education.results.unpluggedReteachReveal')}
          </button>
          <button
            type="button"
            data-testid="unplugged-reteach-next"
            onClick={handleNext}
            disabled={safeIndex >= words.length - 1}
            className={cn(
              'flex items-center justify-center gap-1 px-3 py-3 font-bold text-sm',
              'bg-neo-navy text-neo-white border-neo border-neo-black rounded-neo shadow-hard-sm',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {t('education.results.unpluggedReteachNext')}
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          data-testid="print-missed-words-practice-sheet"
          onClick={handlePrint}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 font-bold',
            'bg-neo-cream text-neo-black border-neo border-neo-black rounded-neo',
            'shadow-hard-sm hover:shadow-hard transition-all',
          )}
        >
          <Printer className="w-5 h-5" aria-hidden />
          {t('education.results.printPracticeSheet')}
        </button>
      </div>
    </div>
  );
}
