'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import type { HolidayOverride } from '@/lib/holidays/region';
import { cn } from '@/lib/utils';

const ACTIVE: Record<HolidayOverride, string> = {
  hanukkah: 'bg-neo-holiday-blue text-neo-holiday-snow',
  christmas: 'bg-neo-holiday-red text-neo-holiday-snow',
  off: 'bg-neo-cream text-neo-navy',
};

export default function HolidayToggle({ className }: { className?: string }) {
  const { t } = useLanguage();
  const { holiday, resolved, available, setOverride } = useHoliday();
  if (!resolved || available.length === 0) return null;

  const options: HolidayOverride[] = [...available, 'off'];
  const current: HolidayOverride = holiday ?? 'off';

  return (
    <div role="group" aria-label={t('holiday.toggle.label')} className={cn('inline-flex gap-2', className)}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={o === current}
          onClick={() => setOverride(o)}
          className={cn(
            'min-h-11 rounded-neo border-2 border-neo-black px-3 py-1 font-neo-body text-sm font-bold shadow-hard motion-safe:transition-transform active:translate-x-px active:translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan',
            o === current ? ACTIVE[o] : 'bg-neo-navy-light text-neo-cream',
          )}
        >
          {t(`holiday.toggle.${o}`)}
        </button>
      ))}
    </div>
  );
}
