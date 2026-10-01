'use client';

import { ClipboardList } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

/** How much homework is out, beside the class chip; zero is the first-assignment nudge's job. */
export function HqAssignmentsPill({ count, onOpen, className }: { count: number | null; onOpen: () => void; className?: string }) {
  const { t } = useLanguage();
  if (!count) return null;
  return (
    <button
      type="button"
      data-testid="hq-assignments-pill"
      onClick={onOpen}
      aria-label={t('eduHq.hq.assignedAria', { count })}
      title={t('eduHq.hq.assigned', { count })}
      className={cn(
        'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-neo border-2 border-neo-lime bg-neo-navy-light px-2.5 font-neo-display text-xs font-black uppercase text-neo-white shadow-hard-sm',
        'transition-[box-shadow] duration-100 hover:shadow-hard active:shadow-none focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan lg:min-h-10 lg:text-sm',
        className,
      )}
    >
      <ClipboardList className="size-4 shrink-0 text-neo-lime" strokeWidth={2.75} aria-hidden="true" />
      <span className="tabular-nums sm:hidden">{count}</span>
      <span className="hidden sm:inline">{t('eduHq.hq.assigned', { count })}</span>
    </button>
  );
}

export default HqAssignmentsPill;
