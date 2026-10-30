'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';

/** "LexiClash for Teachers" lockup: links home, never out of the teacher app. */
export function TeacherBrand({
  href,
  t,
  compact = false,
}: {
  href: string;
  t: (key: string) => string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      data-testid="teacher-brand"
      aria-label={t('eduShell.brand.homeLink')}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-neo',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
      )}
    >
      <EduMascot moment="welcome" size={compact ? 36 : 44} className={compact ? 'size-9 shrink-0' : 'size-11 shrink-0'} />
      <span className="flex min-w-0 flex-col leading-none">
        <span className={cn('truncate font-neo-display font-black text-neo-cream', compact ? 'text-lg' : 'text-xl')}>
          {t('eduShell.brand.name')}
        </span>
        <span className="truncate font-neo-display text-xs font-bold text-neo-cream/70">{t('eduShell.brand.tagline')}</span>
      </span>
    </Link>
  );
}

export default TeacherBrand;
