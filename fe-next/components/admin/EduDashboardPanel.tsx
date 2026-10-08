'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { WindowDays } from '@/lib/admin/eduMetrics';
import { EduDashboardSections, type EduDashboardView } from './EduDashboardSections';

const WINDOWS: WindowDays[] = [7, 30, 90];

export function EduDashboardPanel() {
  const { t } = useLanguage();
  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [data, setData] = useState<EduDashboardView | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetchWithAuth(`/api/admin/edu-dashboard?window=${windowDays}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as EduDashboardView;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  return (
    <section className="space-y-4 text-white" aria-labelledby="edu-dashboard-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="edu-dashboard-title" className="font-bold text-lg">
            {t('admin.eduDashboard.title', 'Education overview')}
          </h2>
          <p className="text-xs text-white/60">
            {t('admin.eduDashboard.subtitle', 'Test accounts excluded. Deltas compare with the prior period.')}
          </p>
        </div>
        <div role="group" aria-label={t('admin.eduDashboard.window', 'Window')} className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={windowDays === w}
              onClick={() => setWindowDays(w)}
              className={`rounded border px-3 py-1 text-xs font-semibold tabular-nums ${
                windowDays === w ? 'border-white bg-white text-black' : 'border-white/30 text-white/80'
              }`}
            >
              {`${w}d`}
            </button>
          ))}
        </div>
      </header>

      {failed && (
        <p role="alert" className="rounded border border-red-400/60 p-3 text-sm text-red-300">
          {t('admin.eduDashboard.loadFailed', 'Could not load the education overview.')}
        </p>
      )}
      {!failed && !data && (
        <p className="text-sm text-white/60">{t('admin.eduDashboard.loading', 'Loading…')}</p>
      )}
      {data && <EduDashboardSections data={data} />}
    </section>
  );
}
