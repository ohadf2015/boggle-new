'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DrilldownDialog, type DrillTarget } from './DrilldownDialog';

interface GrowthPoint {
  week: string;
  signups: number;
  total: number;
}

export function SignupGrowthChart({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<GrowthPoint[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/analytics/signup-growth?weeks=26', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: { growth?: GrowthPoint[] } }) => {
        if (!cancelled) setData(json.data?.growth ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-neo-lime" />
        {t('admin.kpi.growthTitle')}
      </h3>
      <p className="text-xs text-slate-500 mb-3">{t('admin.kpi.growthNote')}</p>

      {failed ? (
        <div data-testid="growth-error" className="text-sm text-red-400 py-6">
          {t('admin.activity.error')}
        </div>
      ) : data === null ? (
        <div data-testid="growth-skeleton" className="bg-neo-navy-elevated/30 rounded animate-pulse h-56" />
      ) : data.length === 0 ? (
        <div data-testid="growth-empty" className="text-sm text-slate-500 text-center py-12">
          {t('admin.activity.empty')}
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
              <YAxis yAxisId="total" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis yAxisId="weekly" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                yAxisId="weekly"
                dataKey="signups"
                name={t('admin.kpi.growthWeekly')}
                fill="#00FFFF"
                fillOpacity={0.55}
                cursor="pointer"
                onClick={(bar: { week?: string; payload?: { week?: string } }) => {
                  const week = bar.week ?? bar.payload?.week;
                  if (week) setDrill({ kind: 'signups', week });
                }}
              />
              <Area
                yAxisId="total"
                type="monotone"
                dataKey="total"
                name={t('admin.kpi.growthTotal')}
                stroke="#BFFF00"
                fill="#BFFF00"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-xs text-slate-500 mt-2">{t('admin.kpi.growthHint')}</p>
      <DrilldownDialog target={drill} authToken={authToken} onClose={() => setDrill(null)} />
    </div>
  );
}
