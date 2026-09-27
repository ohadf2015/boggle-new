'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface DailyPoint {
  date: string;
  games: number;
  guestGames: number;
  totalGames: number;
  uniquePlayers: number;
  uniqueGuests: number;
  totalUniquePlayers: number;
  signups: number;
}

const RANGES = [7, 30, 90] as const;
type Range = typeof RANGES[number];

interface DailyActivityChartProps {
  authToken: string;
}

export function DailyActivityChart({ authToken }: DailyActivityChartProps) {
  const { t } = useLanguage();
  const [days, setDays] = useState<Range>(30);
  const [data, setData] = useState<DailyPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);

    fetch(`/api/admin/activity/daily?days=${days}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { daily?: DailyPoint[] }) => {
        if (cancelled) return;
        setData(json.daily ?? []);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [authToken, days]);

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-neo-cyan" />
          {t('admin.activity.title')}
        </h3>

        <div className="flex gap-1">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                'px-2 py-0.5 text-xs font-bold rounded-neo border border-black transition-colors',
                days === d
                  ? 'bg-neo-cyan text-black'
                  : 'bg-neo-navy-elevated text-neo-white hover:bg-slate-600'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div
          data-testid="daily-activity-error"
          className="flex items-center gap-2 text-sm text-red-400 py-6"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{t('admin.activity.error')}: {error}</span>
        </div>
      ) : data === null ? (
        <div
          data-testid="daily-activity-skeleton"
          className="bg-neo-navy-elevated/30 rounded animate-pulse h-48"
        />
      ) : data.length === 0 ? (
        <div
          data-testid="daily-activity-empty"
          className="text-sm text-slate-500 text-center py-12"
        >
          {t('admin.activity.empty')}
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: 8,
                }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="totalGames"
                name={t('admin.activity.totalGames')}
                stroke="#BFFF00"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="totalUniquePlayers"
                name={t('admin.activity.uniquePlayers')}
                stroke="#00FFFF"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="signups"
                name={t('admin.activity.signups')}
                stroke="#FF1493"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
