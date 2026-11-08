'use client';

import { useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { Building2, Lock, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { WordStudentGrid } from '@/components/teacher/report/WordStudentGrid';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { buildRoundWordGrid, type RoundWordGridInput } from './roundWordGrid';
import { ProPill } from './ProPill';

export const ROUND_GRID_SCHOOL_SOURCE = 'class_report_grid' as const;

export interface RoundGridOffer {
  href: string;
  label: string;
  note: string;
  onClick: () => void;
}

export interface RoundWordGridDialogProps {
  language: string;
  round: RoundWordGridInput;
  /** Shown only with the upsell footer. */
  proLabel?: string;
  /** Null while the access trial already opens the full report. */
  offer: RoundGridOffer | null;
  /** False for a Pro teacher: no depth footer at all. */
  upsell?: boolean;
  onClose: () => void;
}

const ACTION =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-neo-lg border-[3px] border-neo-black px-3 text-center font-neo-display text-sm font-black shadow-hard-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-px active:translate-y-px active:shadow-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Opened by the teacher, so names never sit on the wall unasked. */
export function RoundWordGridDialog({ language, round, proLabel = 'Pro', offer, upsell = true, onClose }: RoundWordGridDialogProps) {
  const { t } = useLanguage();
  const grid = useMemo(() => buildRoundWordGrid(round), [round]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-neo-navy/80 p-2 sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="round-grid-title"
        data-testid="round-grid-dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-neo-xl border-[3px] border-neo-black bg-neo-cream text-neo-black shadow-hard-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b-[3px] border-neo-black px-4 py-3">
          <div className="min-w-0">
            <h2 id="round-grid-title" className="font-neo-display text-lg font-black leading-tight sm:text-2xl">
              {t('eduProResults.gridTitle')}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-neo-black/75 sm:text-sm">{t('eduProResults.namesNote')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            data-testid="round-grid-close"
            onClick={onClose}
            aria-label={t('eduProResults.close')}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-white shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {grid.rows.length === 0 ? (
            <p className="text-sm font-bold">{t('eduProResults.noWords')}</p>
          ) : (
            <WordStudentGrid grid={grid} />
          )}
        </div>

        {upsell ? (
          <footer data-testid="round-grid-depth" className="flex flex-col gap-2 border-t-[3px] border-neo-black bg-neo-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 font-neo-display text-sm font-black">
                <Lock className="size-4 shrink-0" aria-hidden="true" />
                {t('eduProResults.proDepthTitle')}
                <ProPill label={proLabel} />
              </p>
              <p className="mt-0.5 text-xs font-semibold text-neo-black/75">{t('eduProResults.proDepth')}</p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
              {offer ? (
                <>
                  <Link
                    href={offer.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="round-grid-cta"
                    onClick={offer.onClick}
                    className={cn(ACTION, 'bg-neo-pink text-neo-white')}
                  >
                    <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                    {offer.label}
                  </Link>
                  <span className="text-center text-xs font-semibold text-neo-black/70 sm:text-end">{offer.note}</span>
                </>
              ) : null}
              <Link
                href={`/${language}/education/for-schools?source=${ROUND_GRID_SCHOOL_SOURCE}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="round-grid-school-quote"
                onClick={() => {
                  try {
                    trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell', source: ROUND_GRID_SCHOOL_SOURCE, locale: language });
                  } catch {
                    /* analytics must never block */
                  }
                }}
                className="inline-flex min-h-11 items-center justify-center gap-1 text-xs font-bold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
              >
                <Building2 className="size-4 shrink-0" aria-hidden="true" />
                {t('eduProResults.schoolQuote')}
              </Link>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export default RoundWordGridDialog;
