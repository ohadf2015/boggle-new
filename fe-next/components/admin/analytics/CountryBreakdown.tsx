'use client';

import { useEffect, useState } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CountryRow {
  country: string;
  count: number;
  registered: number;
  guests: number;
}

interface CountryResponse {
  countries: CountryRow[];
  totals: { registeredUsers: number; guestPlayers: number };
}

interface Props {
  authToken: string;
}

export function CountryBreakdown({ authToken }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<CountryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch('/api/admin/players/countries', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: CountryResponse) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  if (error) {
    return (
      <div data-testid="country-breakdown-error" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('admin.geo.error')}: {error}</span>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div data-testid="country-breakdown-skeleton" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 mb-6 animate-pulse h-48" />
    );
  }

  const max = data.countries[0]?.count ?? 1;

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-neo-cyan" />
          {t('admin.geo.title')}
        </h3>

        <div data-testid="country-totals" className="text-xs text-slate-400">
          <span className="text-neo-white font-bold">{data.totals.registeredUsers}</span> {t('admin.geo.registered')}
          {' · '}
          <span className="text-neo-white font-bold">{data.totals.guestPlayers}</span> {t('admin.geo.guests')}
        </div>
      </div>

      {data.countries.length === 0 ? (
        <div data-testid="country-breakdown-empty" className="text-sm text-slate-500 text-center py-8">
          {t('admin.geo.empty')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {data.countries.slice(0, 15).map((c) => {
            const pct = (c.count / max) * 100;
            return (
              <div key={c.country} data-testid="country-row" className="flex items-center gap-3 text-xs">
                <span className="font-mono text-neo-white w-10 shrink-0">{c.country}</span>
                <div className="flex-1 h-5 bg-neo-navy-elevated/50 rounded-sm overflow-hidden flex">
                  <div
                    className={cn('h-full bg-neo-lime/70')}
                    style={{ width: `${(c.registered / max) * 100}%` }}
                  />
                  <div
                    className={cn('h-full bg-neo-cyan/70')}
                    style={{ width: `${(c.guests / max) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-neo-white w-10 text-right">{c.count}</span>
                <span className="font-mono text-slate-500 w-12 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}

          <div className="border-t border-slate-700 pt-2 mt-2 flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-neo-lime/70 inline-block" />{t('admin.geo.registered')}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-neo-cyan/70 inline-block" />{t('admin.geo.guests')}</span>
          </div>
        </div>
      )}
    </div>
  );
}
