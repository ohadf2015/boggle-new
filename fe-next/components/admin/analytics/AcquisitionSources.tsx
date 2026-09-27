'use client';

import { useEffect, useMemo, useState } from 'react';
import { Megaphone, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NameCount { name: string; count: number }

interface SourcesResponse {
  sources: NameCount[];
  mediums: NameCount[];
  campaigns: NameCount[];
  referrers: NameCount[];
  breakdown: {
    registeredUsers: number;
    guestPlayers: number;
    registeredSources: NameCount[];
    guestSources: NameCount[];
  };
}

type Dimension = 'sources' | 'mediums' | 'campaigns' | 'referrers';

const DIMENSIONS: { key: Dimension; labelKey: string }[] = [
  { key: 'sources', labelKey: 'admin.acquisition.sources' },
  { key: 'mediums', labelKey: 'admin.acquisition.mediums' },
  { key: 'campaigns', labelKey: 'admin.acquisition.campaigns' },
  { key: 'referrers', labelKey: 'admin.acquisition.referrers' },
];

interface Props {
  authToken: string;
}

export function AcquisitionSources({ authToken }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<SourcesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dim, setDim] = useState<Dimension>('sources');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch('/api/admin/players/sources', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: SourcesResponse) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });

    return () => { cancelled = true; };
  }, [authToken]);

  const rows = useMemo(() => (data ? data[dim] : []), [data, dim]);
  const max = rows[0]?.count ?? 1;

  if (error) {
    return (
      <div data-testid="sources-error" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('admin.acquisition.error')}: {error}</span>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div data-testid="sources-skeleton" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 mb-6 animate-pulse h-48" />
    );
  }

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-neo-pink" />
          {t('admin.acquisition.title')}
        </h3>

        <div className="flex gap-1">
          {DIMENSIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDim(d.key)}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded-neo border border-black transition-colors',
                dim === d.key
                  ? 'bg-neo-pink text-black'
                  : 'bg-neo-navy-elevated text-neo-white hover:bg-slate-600'
              )}
            >
              {t(d.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div data-testid="sources-empty" className="text-sm text-slate-500 text-center py-8">
          {t('admin.acquisition.empty')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 12).map((row) => {
            const pct = (row.count / max) * 100;
            return (
              <div key={row.name} data-testid="source-row" className="flex items-center gap-3 text-xs">
                <span className="text-neo-white truncate w-32 shrink-0" title={row.name}>{row.name}</span>
                <div className="flex-1 h-5 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
                  <div className="h-full bg-neo-pink/70" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-neo-white w-12 text-right">{row.count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
