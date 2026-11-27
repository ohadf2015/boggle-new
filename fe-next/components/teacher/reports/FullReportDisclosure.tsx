'use client';

import { useState } from 'react';
import { BookMarked, ChevronDown, ClipboardCheck, FileText, History, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ACCENTS = {
  cyan: 'border-neo-cyan bg-neo-cyan/15 text-edu-cyan-ink',
  lime: 'border-neo-lime bg-neo-lime/15 text-edu-lime-ink',
  pink: 'border-neo-pink bg-neo-pink/15 text-edu-pink-ink',
  purple: 'border-neo-purple bg-neo-purple/15 text-edu-purple-ink',
} as const;

interface ReportDisclosureProps {
  testId: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
  title: string;
  badge?: React.ReactNode;
  hint: string;
  children: (open: boolean) => React.ReactNode;
}

/** Detail on demand: a closed row that keeps a long section one tap away instead of a screen of scroll. */
export function ReportDisclosure({ testId, icon: Icon, accent, title, badge, hint, children }: ReportDisclosureProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      data-testid={testId}
      className="group rounded-neo-lg border-2 border-edu-line bg-edu-surface/95 shadow-hard-sm transition-transform has-[summary:active]:translate-x-[1px] has-[summary:active]:translate-y-[1px] has-[summary:active]:shadow-none motion-reduce:transition-none"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className={`grid size-9 shrink-0 place-items-center rounded-neo border-2 ${ACCENTS[accent]}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-neo-display text-base sm:text-lg font-bold text-edu-ink leading-snug">{title}{badge}</span>
          <span className="block text-xs font-bold text-edu-ink/70 leading-snug">{hint}</span>
        </span>
        <ChevronDown className="size-5 shrink-0 text-edu-ink/80 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="border-t border-edu-line/20 p-3.5 sm:p-5">{children(open)}</div>
    </details>
  );
}

export function FullReportDisclosure({ children }: { children: (open: boolean) => React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <ReportDisclosure
      testId="full-report-disclosure"
      icon={FileText}
      accent="cyan"
      title={t('eduPro.reports.moreDetail')}
      hint={t('eduPro.reports.moreDetailHint')}
    >
      {children}
    </ReportDisclosure>
  );
}

const SECTIONS = {
  assignments: { icon: ClipboardCheck, accent: 'purple' },
  arc: { icon: BookMarked, accent: 'lime' },
  digest: { icon: History, accent: 'pink' },
} as const;

/** A summary-page section folded shut: title + one-line hint, the full panel on tap. */
export function SectionDisclosure({ section, children }: { section: keyof typeof SECTIONS; children: React.ReactNode }) {
  const { t } = useLanguage();
  const { icon, accent } = SECTIONS[section];
  return (
    <ReportDisclosure
      testId={`${section}-disclosure`}
      icon={icon}
      accent={accent}
      title={t(`eduPro.reports.${section}Title`)}
      hint={t(`eduPro.reports.${section}Hint`)}
    >
      {() => children}
    </ReportDisclosure>
  );
}
