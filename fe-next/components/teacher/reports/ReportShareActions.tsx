'use client';

import { useState } from 'react';
import { Check, Printer, Share2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordMasteryReport } from '@/lib/education/wordMasteryReport';
import { cn } from '@/lib/utils';
import { stripEmoji } from '@/lib/share/stripEmoji';
import type { ClassInsights } from './classInsights';

type T = (key: string, params?: Record<string, string | number>) => string;

export function buildReportSummary({
  t,
  classroomName,
  report,
  insights,
  names,
}: {
  t: T;
  classroomName: string;
  report: WordMasteryReport;
  insights: ClassInsights | null;
  names: Record<string, string>;
}): string {
  const lines = [
    t('eg2Rep.report.summary.title', { classroom: classroomName }),
    t('eg2Rep.report.summary.accuracy', { accuracy: report.totals.classAccuracy, games: report.totals.sessions }),
  ];
  if (insights) {
    lines.push(t('eg2Rep.report.summary.mastered', { mastered: insights.masteredWords, words: report.totals.words }));
    const below = insights.students.filter((s) => s.belowGoal);
    if (below.length > 0) {
      const who = below.map((s) => names[s.studentId]).filter(Boolean).join(', ');
      lines.push(t('eg2Rep.report.summary.needHelp', { count: below.length, goal: insights.goal }) + (who ? `: ${who}` : ''));
    }
  }
  const hardest = report.hardestWords.slice(0, 5).map((w) => w.display);
  if (hardest.length > 0) lines.push(t('eg2Rep.report.summary.hardest', { words: hardest.join(', ') }));
  return lines.join('\n');
}

const BTN =
  'inline-flex min-h-10 items-center gap-1.5 rounded-neo border-2 border-neo-cream/50 bg-neo-navy px-3 font-neo-display text-xs font-black uppercase text-neo-white shadow-hard-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan active:translate-y-0 active:shadow-none motion-reduce:transition-none';

export function ReportShareActions({ summary, className }: { summary: () => string; className?: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = stripEmoji(summary());
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // A dismissed share sheet is not an error worth showing.
    }
  };

  return (
    <div data-print-hide className={cn('flex flex-wrap items-center gap-2', className)}>
      <button type="button" onClick={share} className={cn(BTN, copied && 'border-neo-lime text-neo-lime')}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {t('eg2Rep.report.share')}
      </button>
      <button type="button" onClick={() => window.print()} className={BTN}>
        <Printer className="size-4" aria-hidden="true" />
        {t('eg2Rep.report.print')}
      </button>
      <span role="status" className={cn('text-xs font-black text-neo-lime', !copied && 'sr-only')}>
        {copied ? t('eg2Rep.report.copied') : ''}
      </span>
    </div>
  );
}

const PRINT_CSS = `@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
  body { --neo-navy: #ffffff; --neo-navy-light: #ffffff; --neo-cream: #2b2b40; --neo-white: 26 26 46; }
  [data-testid="education-shell"], [data-testid="education-shell-body"], [data-testid="education-shell-body"] > div, [data-testid="education-shell-scroll"] {
    height: auto !important; max-height: none !important; overflow: visible !important; display: block !important; position: static !important;
  }
  [data-testid="education-shell-header"], [data-testid="education-shell-footer"], [data-testid="education-shell-status"], nav, [data-print-hide] { display: none !important; }
  [data-report-print] { box-shadow: none !important; break-inside: auto; }
  [data-report-print] ~ * { display: none !important; }
  [data-report-print] * { box-shadow: none !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}`;

export function ReportPrintStyles() {
  return <style>{PRINT_CSS}</style>;
}
