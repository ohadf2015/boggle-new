'use client';

import { Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { titleLabelKey } from '@/lib/titles/playerTitles';
import { cn } from '@/lib/utils';

export interface TitleBadgeProps {
  title?: string | null;
  size?: 'sm' | 'lg';
  /** Level-up moment: adds a "New title" kicker above the badge. */
  announce?: boolean;
  className?: string;
}

export function TitleBadge({ title, size = 'sm', announce = false, className }: TitleBadgeProps) {
  const { t } = useLanguage();
  if (!title) return null;
  const badge = (
    <span
      data-testid="title-badge"
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-md border-2 border-neo-black bg-neo-purple font-black uppercase tracking-wide text-neo-white shadow-hard-sm',
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-1.5 py-px text-[10px] leading-tight',
        !announce && className,
      )}
    >
      <Crown className={size === 'lg' ? 'h-4 w-4 shrink-0' : 'h-3 w-3 shrink-0'} aria-hidden="true" />
      <span className="truncate">{t(titleLabelKey(title))}</span>
    </span>
  );
  if (!announce) return badge;
  return (
    <span className={cn('inline-flex flex-col items-center gap-1', className)}>
      <span className="text-xs font-black uppercase tracking-[0.16em] text-neo-yellow">
        {t('progression.titles.newTitle')}
      </span>
      {badge}
    </span>
  );
}

export default TitleBadge;
