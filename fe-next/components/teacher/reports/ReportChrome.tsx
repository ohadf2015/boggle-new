'use client';

/**
 * Shared chrome for the Pro progress reports (class + student): loading,
 * error-with-retry, the header with the export control, and the small data
 * marks. Both reports carried their own copy of the fetch and export dances;
 * one copy each is what keeps the two screens behaving the same.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Check, Download, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import logger from '@/utils/logger';

// =============================================
// DATA
// =============================================

type ReportResult<T> = { data: T | null; error: { message: string } | null };

/**
 * Load a report, with a retry and a guard against a slow response for the
 * PREVIOUS student landing after the teacher already clicked the next one.
 */
export function useReportData<T>(load: () => Promise<ReportResult<T>>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ data: T | null; loading: boolean; failed: boolean }>({
    data: null,
    loading: true,
    failed: false,
  });

  useEffect(() => {
    let live = true;
    setState((prev) => ({ ...prev, loading: true, failed: false }));
    load()
      .then((result) => {
        if (!live) return;
        setState({ data: result.error ? null : result.data, loading: false, failed: Boolean(result.error) });
      })
      .catch((err) => {
        // A thrown loader must land on the retry screen, not a skeleton forever.
        logger.error('Error loading report:', err);
        if (live) setState({ data: null, loading: false, failed: true });
      });
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

export type ExportState = 'idle' | 'busy' | 'done' | 'failed';

/** Export with a visible outcome — success confirms, failure says so. */
export function useReportExport(build: () => Promise<void>) {
  const [state, setState] = useState<ExportState>('idle');

  const run = useCallback(async () => {
    setState('busy');
    try {
      await build();
      setState('done');
    } catch (err) {
      logger.error('Error generating PDF:', err);
      setState('failed');
    }
  }, [build]);

  useEffect(() => {
    if (state !== 'done') return;
    const id = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(id);
  }, [state]);

  return { state, run };
}

// =============================================
// STATES
// =============================================

export function ReportSkeleton() {
  const { t } = useLanguage();
  const block = 'rounded-neo bg-neo-cream/10 motion-safe:animate-pulse';
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only" role="status">{t('teacher.reports.loading')}</span>
      <div aria-hidden="true" className="flex flex-col gap-3 border-b-2 border-neo-cream/15 pb-6">
        <div className={cn(block, 'h-9 w-2/3 max-w-sm')} />
        <div className={cn(block, 'h-4 w-1/2 max-w-xs')} />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn(block, 'h-24')} />
        ))}
      </div>
      <div aria-hidden="true" className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn(block, 'h-11')} style={{ opacity: 1 - i * 0.15 }} />
        ))}
      </div>
    </div>
  );
}

export function ReportError({ onRetry }: { onRetry: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-4 rounded-neo border-[3px] border-neo-pink bg-neo-navy-light p-8 text-center shadow-hard">
      <p className="font-neo-display text-lg font-bold text-neo-white">{t('teacher.reports.error')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-cyan px-4 py-2 font-bold text-black shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white active:translate-y-0 active:shadow-none"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        {t('teacher.reports.retry')}
      </button>
    </div>
  );
}

export function ReportEmpty() {
  const { t } = useLanguage();
  return (
    <div className="rounded-neo border-2 border-dashed border-neo-cream/30 p-8 text-center text-neo-cream/80">
      {t('teacher.reports.noData')}
    </div>
  );
}

// =============================================
// HEADER
// =============================================

interface ReportHeaderProps {
  /** Which report this is — read by screen readers as part of the heading. */
  title: string;
  subject: string;
  meta: ReactNode[];
  exportState: ExportState;
  onExport: () => void;
}

export function ReportHeader({ title, subject, meta, exportState, onExport }: ReportHeaderProps) {
  const { t } = useLanguage();
  const busy = exportState === 'busy';
  const done = exportState === 'done';
  const Icon = busy ? Loader2 : done ? Check : Download;

  return (
    <header className="border-b-2 border-neo-cream/15 pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-neo-display text-3xl font-bold leading-tight text-neo-white text-balance sm:text-4xl">
            <span className="sr-only">{title}: </span>
            <span className="break-words">{subject}</span>
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neo-cream/80">
            <span aria-hidden="true">{title}</span>
            {meta.map((item, i) => (
              <span key={i} className="contents">
                <span aria-hidden="true" className="text-neo-cream/40">·</span>
                <span>{item}</span>
              </span>
            ))}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-lime px-2.5 py-1 text-xs font-black uppercase tracking-wide text-black shadow-hard-sm">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {t('teacher.plan.pro')}
          </span>
          <button
            type="button"
            onClick={onExport}
            disabled={busy}
            aria-live="polite"
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black px-4 py-2 font-bold text-black shadow-hard',
              'transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white disabled:cursor-progress disabled:hover:translate-y-0',
              done ? 'bg-neo-cyan' : 'bg-neo-lime'
            )}
          >
            <Icon aria-hidden="true" className={cn('size-4', busy && 'motion-safe:animate-spin')} />
            {busy
              ? t('teacher.reports.export.downloading')
              : done
                ? t('teacher.reports.export.done')
                : t('teacher.reports.export.pdf')}
          </button>
        </div>
      </div>

      {exportState === 'failed' && (
        <p role="alert" className="mt-4 rounded-neo border-2 border-neo-pink bg-neo-pink/15 px-3 py-2 text-sm font-medium text-neo-white">
          {t('teacher.reports.export.failed')}
        </p>
      )}
    </header>
  );
}

// =============================================
// MARKS
// =============================================

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 font-neo-display text-xl font-bold text-neo-white">{children}</h2>;
}

/** Accuracy as a number AND a bar — the number carries meaning, the bar scans. */
export function AccuracyBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 80 ? 'bg-neo-lime' : pct >= 50 ? 'bg-neo-cyan' : 'bg-neo-pink';
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className="relative h-2 w-14 overflow-hidden bg-neo-cream/15 sm:w-20">
        <span className={cn('absolute inset-y-0 start-0', tone)} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums">{value}%</span>
    </span>
  );
}

/** The one animated moment on a report: the mastery bar fills on arrival. */
export function MasteryMeter({ percent, label }: { percent: number; label: string }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-neo-white tabular-nums">{label}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={label}
        className="h-5 overflow-hidden rounded-neo border-2 border-black bg-neo-navy shadow-hard-sm"
      >
        <m.div
          className="h-full origin-left bg-neo-lime rtl:origin-right"
          style={{ width: `${percent}%` }}
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
    </div>
  );
}
