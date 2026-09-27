import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  /** Page title (already translated by the caller). */
  title: string;
  /** Optional secondary line under the title. */
  subtitle?: ReactNode;
  /** Optional trailing content (user chip, refresh button, etc.). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared header row for every admin screen. Centralizes the title/subtitle/
 * actions layout so a single change improves all screens uniformly, instead
 * of each page hand-rolling its own inline `<h1>`.
 */
export function AdminPageHeader({
  title,
  subtitle,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-6', className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-neo-display text-neo-white truncate">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
