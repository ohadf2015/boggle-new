'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { EDU_BUTTON } from '@/components/education/eduNeoStyles';
import { OUTLINE_BUTTON } from '@/components/teacher/home/homeStyles';
import { cn } from '@/lib/utils';
import { pluralKeyOf } from '@/lib/i18n/pluralKey';

interface ClassReportHeaderProps {
  eyebrow: string;
  name: string;
  onBack: () => void;
  link?: { href: string; label: string; testId: string };
  memberCount?: number;
  children?: ReactNode;
}

/** One header for both halves of a class's results, so moving between them reads as one report. */
export function ClassReportHeader({ eyebrow, name, onBack, link, memberCount, children }: ClassReportHeaderProps) {
  const { t, language } = useLanguage();
  const backLabel = t('eduShell.home.classPage');
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4">
      <button
        type="button"
        onClick={onBack}
        title={backLabel}
        className={cn(OUTLINE_BUTTON, 'shrink-0 max-sm:size-11 max-sm:px-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan')}
      >
        <DirectionalIcon icon={ArrowLeft} className="size-4" />
        <span className="max-sm:sr-only">{backLabel}</span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="font-neo-body text-sm font-bold text-edu-ink/70">{eyebrow}</p>
        <h1 data-wipe className="break-words font-neo-display text-2xl font-bold leading-tight text-edu-ink md:text-3xl">
          <bdi>{name}</bdi>
        </h1>
        {typeof memberCount === 'number' ? (
          <p data-testid="class-report-size" className="font-neo-body text-sm font-bold text-edu-ink/70">
            {t(pluralKeyOf('teacher.classroom.members', memberCount, language), { count: memberCount })}
          </p>
        ) : null}
      </div>
      {link ? (
        <Link href={link.href} data-testid={link.testId} className={cn(EDU_BUTTON.secondary, 'shrink-0')}>{link.label}</Link>
      ) : null}
      {children}
    </div>
  );
}
