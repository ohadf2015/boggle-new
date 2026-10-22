'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { WindowDays } from '@/lib/admin/eduMetrics';
import { EduDashboardSections, type EduDashboardView } from './EduDashboardSections';
import { CHIP_OFF, CHIP_ON } from './edu-dashboard/eduDashboardShared';

const WINDOWS: WindowDays[] = [7, 30, 90];

function isDashboardView(json: unknown): json is EduDashboardView {
  const v = json as Partial<EduDashboardView> | null;
  return !!v && typeof v.kpis === 'object' && v.kpis !== null && !!v.sparklines && !!v.drill && !!v.attention;
}

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
        return (await res.json()) as unknown;
      })
      .then((json) => {
        if (cancelled) return;
        if (isDashboardView(json)) setData(json);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  return (
    <section className="space-y-4 text-neo-cream" aria-labelledby="edu-dashboard-title">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="edu-dashboard-title" className="font-bold text-lg">
            {t('admin.eduDashboard.title', 'Education overview')}
          </h2>
          <p className="text-xs text-neo-cream/70">
            {t('admin.eduDashboard.subtitle', 'Test accounts are left out of every number. Each change compares with the same number of days just before.')}
          </p>
        </div>
        <div role="group" aria-label={t('admin.eduDashboard.window', 'Window')} className="flex flex-wrap gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={windowDays === w}
              onClick={() => setWindowDays(w)}
              className={`rounded border px-3 py-1 text-xs font-semibold tabular-nums ${windowDays === w ? CHIP_ON : CHIP_OFF}`}
            >
              {t('admin.eduDashboard.windowLast', 'Last {days} days', { days: w })}
            </button>
          ))}
        </div>
      </header>

      {failed && (
        <p role="alert" className="rounded border-2 border-neo-red p-3 text-sm text-neo-red">
          {t('admin.eduDashboard.loadFailed', 'Could not load the education overview.')}
        </p>
      )}
      {!failed && !data && (
        <p className="text-sm text-neo-cream/70">{t('admin.eduDashboard.loading', 'Loading…')}</p>
      )}
      {data && <EduDashboardSections data={data} />}
    </section>
  );
}
