'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FlaskConical, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import BrainCheckVerdict from './BrainCheckVerdict';
import { BRAIN_CHECK_DRILLS, type BrainCheckDrill, type BrainCheckSummary } from '@/shared/utils/brainCheck';

type Checks = Record<BrainCheckDrill, BrainCheckSummary>;
const METHOD_KEYS = ['fixed', 'warmup', 'noise', 'transfer'] as const;

function hoursUntil(iso: string): number {
  return Math.max(1, Math.ceil((Date.parse(iso) - Date.now()) / 3_600_000));
}

/**
 * Brain Check hub panel: one row per measured drill with its honest trend,
 * plus a plain-language "how we measure" that states the limits up front.
 */
export default function BrainCheckPanel() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [checks, setChecks] = useState<Checks | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await fetch('/api/brain/checks', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setChecks((await res.json()).checks);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section
      aria-labelledby="brain-check-title"
      className={cn(
        'rounded-neo border-4 border-neo-black p-4 shadow-hard-lg',
        isDarkMode ? 'bg-neo-navy-light text-neo-white' : 'bg-white text-neo-black'
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-neo border-3 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id="brain-check-title" className="font-neo-display text-xl font-black uppercase tracking-wide">
          {t('brain.check.title')}
        </h2>
      </div>
      <p className="mb-4 text-sm opacity-90">{t('brain.check.subtitle')}</p>

      {failed && (
        <button type="button" onClick={load} className="mb-3 w-full rounded-neo border-3 border-neo-black bg-neo-orange px-3 py-2 text-sm font-bold text-neo-black">
          {t('brain.check.loadFailed')}
        </button>
      )}

      <ul className="space-y-3">
        {checks && BRAIN_CHECK_DRILLS.map((drill) => {
          const c = checks[drill];
          return (
            <li
              key={drill}
              data-testid="brain-check-row"
              className={cn('rounded-neo border-3 border-neo-black p-3', isDarkMode ? 'bg-neo-navy' : 'bg-neo-cream')}
            >
              <div className="mb-2 flex items-center gap-3">
                <Image src={`/brain-drills/${drill}-emblem.jpg`} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-neo border-2 border-neo-black object-cover" />
                <span className="min-w-0 flex-1 truncate font-black">{t(`brain.drills.${drill}.name`)}</span>
                {c.available ? (
                  <Link
                    href={`/${language}/brain/drills/${drill}?check=1`}
                    aria-label={`${t('brain.check.start')} — ${t(`brain.drills.${drill}.name`)}`}
                    className="inline-flex shrink-0 items-center gap-1 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1.5 text-sm font-black uppercase text-neo-black shadow-hard-sm transition-transform hover:-translate-y-0.5"
                  >
                    <Play className="h-4 w-4" aria-hidden="true" />
                    {t('brain.check.start')}
                  </Link>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold opacity-80">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    {t('brain.check.nextIn', { h: hoursUntil(c.nextAvailableAt as string) })}
                  </span>
                )}
              </div>
              <BrainCheckVerdict analysis={c.analysis} />
            </li>
          );
        })}
      </ul>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-bold">{t('brain.check.howItWorks')}</summary>
        <ul className="mt-2 list-disc space-y-1 ps-5 opacity-90">
          {METHOD_KEYS.map((k) => <li key={k}>{t(`brain.check.method.${k}`)}</li>)}
        </ul>
      </details>
    </section>
  );
}
