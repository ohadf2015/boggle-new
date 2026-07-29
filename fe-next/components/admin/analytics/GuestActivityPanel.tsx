'use client';

import { useEffect, useState } from 'react';
import { UserX, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NameCount { count: number }

interface ModeRow extends NameCount { mode: string }
interface LangRow extends NameCount { language: string }

interface GuestStats {
  totalGames: number;
  totalScore: number;
  avgScore: number;
  uniqueGuests: number;
  byMode: ModeRow[];
  byLanguage: LangRow[];
}

interface GuestResponse {
  sessions: unknown[];
  stats: GuestStats;
}

const DEFAULT_DAYS = 30;

interface Props {
  authToken: string;
}

export function GuestActivityPanel({ authToken }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<GuestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/admin/analytics/guest-games?days=${DEFAULT_DAYS}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: GuestResponse) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });

    return () => { cancelled = true; };
  }, [authToken]);

  if (error) {
    return (
      <div data-testid="guest-activity-error" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('admin.guests.error')}: {error}</span>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div data-testid="guest-activity-skeleton" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 mb-6 animate-pulse h-48" />
    );
  }

  const { stats } = data;

  if (stats.totalGames === 0) {
    return (
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-2">
          <UserX className="w-4 h-4 text-neo-orange" />
          {t('admin.guests.title')}
        </h3>
        <div data-testid="guest-activity-empty" className="text-sm text-slate-500 text-center py-6">
          {t('admin.guests.empty')}
        </div>
      </div>
    );
  }

  const maxMode = stats.byMode[0]?.count ?? 1;
  const maxLang = stats.byLanguage[0]?.count ?? 1;

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-3">
        <UserX className="w-4 h-4 text-neo-orange" />
        {t('admin.guests.title')}
        <span className="ms-2 text-xs text-slate-500 font-normal">{t('admin.guests.windowDays', { days: DEFAULT_DAYS } as never) || `${DEFAULT_DAYS}d`}</span>
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat testId="guest-total-games" label={t('admin.guests.totalGames')} value={stats.totalGames} />
        <Stat testId="guest-unique" label={t('admin.guests.uniqueGuests')} value={stats.uniqueGuests} />
        <Stat testId="guest-avg-score" label={t('admin.guests.avgScore')} value={stats.avgScore} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniBars label={t('admin.guests.byMode')} items={stats.byMode.map(m => ({ name: m.mode, count: m.count }))} max={maxMode} barClass="bg-neo-pink/70" />
        <MiniBars label={t('admin.guests.byLanguage')} items={stats.byLanguage.map(l => ({ name: l.language, count: l.count }))} max={maxLang} barClass="bg-neo-cyan/70" />
      </div>
    </div>
  );
}

function Stat({ testId, label, value }: { testId: string; label: string; value: number }) {
  return (
    <div data-testid={testId} className="bg-neo-navy-elevated/30 rounded-neo border border-slate-700 p-2">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-neo-display text-neo-white">{value.toLocaleString()}</div>
    </div>
  );
}

function MiniBars({ label, items, max, barClass }: { label: string; items: { name: string; count: number }[]; max: number; barClass: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1.5">{label}</div>
      <div className="space-y-1">
        {items.slice(0, 6).map((row) => (
          <div key={row.name} className="flex items-center gap-2 text-xs">
            <span className="text-neo-white truncate w-20 shrink-0">{row.name}</span>
            <div className="flex-1 h-4 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
              <div className={cn('h-full', barClass)} style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="font-mono text-neo-white w-10 text-right">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
