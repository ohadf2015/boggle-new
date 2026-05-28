'use client';

import { useEffect, useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface NameCount { count: number }
interface ModeRow extends NameCount { mode: string }
interface LangRow extends NameCount { language: string }

interface AuthStats {
  totalGames: number;
  totalScore: number;
  avgScore: number;
  uniqueUsers: number;
  completedCount: number;
  completionRate: number;
  byMode: ModeRow[];
  byLanguage: LangRow[];
}

interface AuthResponse {
  stats: AuthStats;
  sampledFromLast: number;
  days: number;
}

const DEFAULT_DAYS = 30;

interface Props {
  authToken: string;
}

export function AuthSessionsPanel({ authToken }: Props) {
  const { t } = useLanguage();
  const [data, setData] = useState<AuthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/admin/analytics/auth-games?days=${DEFAULT_DAYS}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: AuthResponse) => {
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
      <div data-testid="auth-sessions-error" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('admin.authSessions.error')}: {error}</span>
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div data-testid="auth-sessions-skeleton" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-6 mb-6 animate-pulse h-48" />
    );
  }

  const { stats } = data;

  if (stats.totalGames === 0) {
    return (
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-neo-lime" />
          {t('admin.authSessions.title')}
        </h3>
        <div data-testid="auth-sessions-empty" className="text-sm text-slate-500 text-center py-6">
          {t('admin.authSessions.empty')}
        </div>
      </div>
    );
  }

  const maxMode = stats.byMode[0]?.count ?? 1;
  const maxLang = stats.byLanguage[0]?.count ?? 1;

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-neo-lime" />
        {t('admin.authSessions.title')}
        <span className="ms-2 text-xs text-slate-500 font-normal">{data.days}d window</span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Stat testId="auth-total-games" label={t('admin.authSessions.totalGames')} value={stats.totalGames.toLocaleString()} />
        <Stat testId="auth-unique-users" label={t('admin.authSessions.uniqueUsers')} value={stats.uniqueUsers.toLocaleString()} />
        <Stat testId="auth-avg-score" label={t('admin.authSessions.avgScore')} value={stats.avgScore.toLocaleString()} />
        <Stat testId="auth-completion-rate" label={t('admin.authSessions.completionRate')} value={`${stats.completionRate}%`} subtitle={`${stats.completedCount}/${stats.totalGames}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MiniBars label={t('admin.authSessions.byMode')} items={stats.byMode.map(m => ({ name: m.mode, count: m.count }))} max={maxMode} barClass="bg-neo-lime/70" />
        <MiniBars label={t('admin.authSessions.byLanguage')} items={stats.byLanguage.map(l => ({ name: l.language, count: l.count }))} max={maxLang} barClass="bg-neo-cyan/70" />
      </div>
    </div>
  );
}

function Stat({ testId, label, value, subtitle }: { testId: string; label: string; value: string; subtitle?: string }) {
  return (
    <div data-testid={testId} className="bg-neo-navy-elevated/30 rounded-neo border border-slate-700 p-2">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-lg font-neo-display text-neo-white">{value}</div>
      {subtitle && <div className="text-[10px] text-slate-500">{subtitle}</div>}
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
            <span className="text-neo-white truncate w-24 shrink-0">{row.name}</span>
            <div className="flex-1 h-4 bg-neo-navy-elevated/50 rounded-sm overflow-hidden">
              <div className={cn('h-full', barClass)} style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
            <span className="font-mono text-neo-white w-12 text-right">{row.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
