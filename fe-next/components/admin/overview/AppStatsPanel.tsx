'use client';

import { useCallback, useEffect, useState } from 'react';
import { Smartphone, Store } from 'lucide-react';
import { cachedAdminJson } from '@/lib/admin/adminJsonCache';
import { useLanguage } from '@/contexts/LanguageContext';

interface AppStats {
  app: { total: number; new7: number; new30: number; active7: number; active30: number };
  store: { month: string; visitors: number; acquisitions: number; installsTotal: number } | null;
}

export function AppStatsPanel({ authToken }: { authToken: string }) {
  const { t, language } = useLanguage();
  const [data, setData] = useState<AppStats | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    return cachedAdminJson<AppStats>('/api/admin/app-stats', authToken).then(setData, () => setFailed(true));
  }, [authToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (failed) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 rounded border-2 border-neo-red p-3 text-sm text-neo-red">
        {t('admin.appStats.loadFailed', 'Could not load the app numbers.')}
        <button type="button" onClick={() => void load()} className="font-semibold underline">{t('common.retry', 'Retry')}</button>
      </div>
    );
  }
  if (!data) return <div className="h-28 animate-pulse rounded bg-neo-navy-elevated/30" />;

  const n = (v: number) => v.toLocaleString(language);
  const { app, store } = data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-neo border-neo border-black bg-neo-navy-light/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-neo-display text-neo-white">
          <Smartphone className="h-4 w-4 text-neo-lime" />
          {t('admin.appStats.appTitle', 'People in the app')}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile testId="app-new7" label={t('admin.appStats.new7', 'New, 7 days')} value={n(app.new7)} />
          <Tile testId="app-new30" label={t('admin.appStats.new30', 'New, 30 days')} value={n(app.new30)} />
          <Tile testId="app-active7" label={t('admin.appStats.active7', 'Active, 7 days')} value={n(app.active7)} />
          <Tile testId="app-total" label={t('admin.appStats.total', 'Ever opened the app')} value={n(app.total)} />
        </div>
        <p className="mt-2 text-[11px] text-slate-500">{t('admin.appStats.appNote', 'From our own events in the Android app, since May 30. Test accounts left out.')}</p>
      </div>

      <div className="rounded-neo border-neo border-black bg-neo-navy-light/50 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-neo-display text-neo-white">
          <Store className="h-4 w-4 text-neo-cyan" />
          {t('admin.appStats.storeTitle', 'Google Play')}
        </h3>
        {store ? (
          <div className="grid grid-cols-3 gap-3">
            <Tile testId="store-visitors" label={t('admin.appStats.visitors', 'Store visitors')} value={n(store.visitors)} />
            <Tile testId="store-acquisitions" label={t('admin.appStats.acquisitions', 'Installs from store')} value={n(store.acquisitions)} />
            <Tile testId="store-installs" label={t('admin.appStats.installsTotal', 'Installed now')} value={n(store.installsTotal)} />
          </div>
        ) : (
          <p data-testid="store-missing" className="text-sm text-slate-400">
            {t('admin.appStats.storeMissing', 'Store visitors and installs are not connected yet: the Play report needs read access for our service account.')}
          </p>
        )}
      </div>
    </div>
  );
}

function Tile({ testId, label, value }: { testId: string; label: string; value: string }) {
  return (
    <div data-testid={testId} className="rounded border border-white/10 p-2.5">
      <div className="font-neo-display text-2xl leading-tight text-neo-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
