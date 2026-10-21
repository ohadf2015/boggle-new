/**
 * Email-ready weekly classroom report on Teacher HQ.
 *
 * Sits next to WeeklyProgressDigestCard and turns the same weekly numbers
 * into a plain-text report a teacher can paste straight into an email to
 * parents/admins: four metrics, a copy control (clipboard with share-sheet
 * fallback), and a mailto draft built from the same subject + body.
 */
'use client';

import { useState } from 'react';
import { Check, Copy, Loader2, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWeeklyProgressDigest } from '@/hooks/useWeeklyProgressDigest';
import {
  buildWeeklyEmailMailto,
  buildWeeklyEmailReport,
} from '@/lib/education/weeklyEmailReport';
import { WEEK_MS, formatWowDelta } from '@/lib/education/weeklyProgressDigest';
import { trackTeacherWeeklyEmailReportCopied } from '@/lib/education/telemetry';
import { stripEmoji } from '@/lib/share/stripEmoji';
import { Stat } from '@/components/ui/Stat';
import { NeoPanel } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

export interface WeeklyEmailReportProps {
  classroomId: string;
  classroomName: string;
}

type T = (key: string, params?: Record<string, string | number>) => string;

const BTN =
  'inline-flex min-h-10 items-center gap-1.5 rounded-neo border-2 border-neo-cream/50 bg-neo-navy px-3 font-neo-display text-xs font-black uppercase text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none motion-reduce:transition-none';

export function WeeklyEmailReport({ classroomId, classroomName }: WeeklyEmailReportProps) {
  const { t, language } = useLanguage();
  const {
    metrics,
    isLoading,
    error,
    refresh,
    studentsJoinedThisWeek,
    wordsMasteredThisWeek,
  } = useWeeklyProgressDigest(classroomId);
  const [copied, setCopied] = useState(false);

  const report = () =>
    buildWeeklyEmailReport(
      t as T,
      {
        classroomName,
        weekStartIso: new Date(Date.now() - WEEK_MS).toISOString(),
        studentsJoinedThisWeek,
        gamesPlayed: metrics?.thisWeek.gamesCompleted ?? 0,
        averageScorePct: metrics?.averageScorePct ?? null,
        scoreWowDeltaPct: metrics?.averageScoreWowDeltaPct ?? null,
        wordsMasteredThisWeek,
      },
      language,
    );

  const copy = async () => {
    const { subject, body } = report();
    const text = stripEmoji(`${subject}\n\n${body}`);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else if (typeof navigator.share === 'function') {
        await navigator.share({ text });
      } else {
        return;
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
      trackTeacherWeeklyEmailReportCopied({ classroomId });
    } catch {
      // Clipboard denied — fall back to the share sheet before giving up.
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share({ text });
          trackTeacherWeeklyEmailReportCopied({ classroomId });
        }
      } catch {
        // A dismissed share sheet is not an error worth showing.
      }
    }
  };

  const scoreTrend =
    metrics?.averageScorePct != null
      ? `${metrics.averageScorePct}%${
          metrics.averageScoreWowDeltaPct != null ? ` (${formatWowDelta(metrics.averageScoreWowDeltaPct)})` : ''
        }`
      : '—';

  return (
    <section
      data-testid="weekly-email-report"
      aria-label={t('teacher.digest.emailReportRegionLabel', { classroom: classroomName })}
      className="space-y-3"
    >
      <header>
        <h2 className="font-neo-display text-lg font-bold text-neo-white">
          {t('teacher.digest.emailReportTitle')}
        </h2>
        <p className="mt-1 text-sm font-bold text-neo-cream/75">
          {t('teacher.digest.emailReportSubtitle')}
        </p>
      </header>

      {isLoading ? (
        <div
          data-testid="weekly-email-report-loading"
          aria-busy="true"
          className="flex min-h-20 items-center justify-center gap-2 text-neo-cream/80"
        >
          <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          <span>{t('teacher.digest.emailReportLoading')}</span>
        </div>
      ) : error || !metrics ? (
        <NeoPanel tone="navy" className="p-4 text-center" data-testid="weekly-email-report-error">
          <p className="font-bold text-neo-white">{t('teacher.digest.emailReportLoadError')}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-3 inline-flex min-h-11 items-center rounded-neo border-2 border-black bg-neo-cyan px-4 font-neo-display text-sm font-black text-black shadow-hard"
          >
            {t('teacher.digest.retry')}
          </button>
        </NeoPanel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat
              value={studentsJoinedThisWeek}
              label={t('teacher.digest.emailReportStudentsJoinedLabel')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={metrics.thisWeek.gamesCompleted}
              label={t('teacher.digest.emailReportGamesLabel')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={scoreTrend}
              label={t('teacher.digest.emailReportScoreLabel')}
              size="lg"
              className="w-full"
            />
            <Stat
              value={wordsMasteredThisWeek}
              label={t('teacher.digest.emailReportWordsLabel')}
              size="lg"
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="weekly-email-report-copy"
              onClick={() => void copy()}
              className={cn(BTN, copied && 'border-neo-lime text-neo-lime')}
            >
              {copied ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Copy className="size-4" aria-hidden="true" />
              )}
              {t('teacher.digest.emailReportCopy')}
            </button>
            <a
              data-testid="weekly-email-report-mailto"
              href={buildWeeklyEmailMailto(report())}
              className={cn(BTN, 'bg-neo-cyan text-neo-navy')}
            >
              <Mail className="size-4" aria-hidden="true" />
              {t('teacher.digest.emailReportMailto')}
            </a>
            <span
              role="status"
              data-testid="weekly-email-report-copied"
              className={cn('text-xs font-black text-neo-lime', !copied && 'sr-only')}
            >
              {copied ? t('teacher.digest.emailReportCopied') : ''}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default WeeklyEmailReport;
