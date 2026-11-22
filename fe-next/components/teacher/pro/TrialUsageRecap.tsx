'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pluralKey } from '@/lib/i18n/pluralKey';
import { trialStartFromExpiry, type TrialUsage } from '@/lib/education/pro/trialUsage';
import logger from '@/utils/logger';
import { cn } from '@/lib/utils';

const ITEMS = ['games', 'students', 'practice'] as const;

/** "During your trial: 7 class games · 42 students · 90 practice sessions"; zero counts and failed reads render nothing. */
export function TrialUsageRecap({ trialExpires, className }: { trialExpires: string | null | undefined; className?: string }) {
  const { t, language } = useLanguage();
  const [usage, setUsage] = useState<TrialUsage | null>(null);
  const since = trialStartFromExpiry(trialExpires);

  useEffect(() => {
    if (!since) return;
    let live = true;
    fetch(`/api/teacher/trial-usage?since=${encodeURIComponent(since)}`, { credentials: 'same-origin' })
      .then(async (res) => {
        const body = res.ok ? await res.json() : null;
        if (!body?.ok || !body.usage) throw new Error(`trial-usage ${res.status}`);
        if (live) setUsage(body.usage as TrialUsage);
      })
      .catch((err) => logger.warn('[TrialUsageRecap] usage read failed', err));
    return () => {
      live = false;
    };
  }, [since]);

  const parts = usage
    ? ITEMS.filter((k) => usage[k] > 0).map((k) => {
        const base = `teacher.trialUsage.${k}`;
        const slavic = language === 'ru' ? { few: `${base}_few`, many: `${base}_many` } : {};
        const key = pluralKey({ one: `${base}_one`, ...slavic, other: `${base}_other` }, usage[k], language);
        return t(key, { count: usage[k] });
      })
    : [];
  if (parts.length === 0) return null;

  return (
    <span data-testid="trial-usage-recap" className={cn('mt-1 block font-bold text-neo-cream', className)}>
      {t('teacher.trialUsage.lead')} {parts.join(' · ')}
    </span>
  );
}
