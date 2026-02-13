'use client';

import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActiveGamesIndicatorProps {
  count: number;
  className?: string;
}

export function ActiveGamesIndicator({ count, className }: ActiveGamesIndicatorProps) {
  const { t } = useLanguage();

  if (count === 0) {
    return (
      <div className={cn('flex items-center gap-2 text-neo-white/50 text-sm font-neo-body', className)} data-testid="active-games-indicator">
        <span>{t('teacher.teacher.noActiveGames')}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm font-neo-body', className)} data-testid="active-games-indicator">
      <span className="relative flex h-2.5 w-2.5" data-testid="live-pulse">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neo-lime" />
      </span>
      <AnimatedCounter value={count} size="sm" variant="success" />
      <span className="text-neo-white/70">{t('teacher.teacher.activeGames')}</span>
    </div>
  );
}
