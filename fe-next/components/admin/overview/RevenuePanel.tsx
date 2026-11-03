'use client';

import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { DrilldownDialog, type DrillTarget } from './DrilldownDialog';

interface Revenue {
  registered?: number;
  paying?: number;
  trialing?: number;
  granted?: number;
  checkoutsStarted30d?: number;
  paidOrders30d?: number;
  offerwallUsd30d?: number;
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : '0%';
}

export function RevenuePanel({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [rev, setRev] = useState<Revenue | null>(null);
  const [failed, setFailed] = useState(false);
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/analytics/revenue', { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: { revenue?: Revenue } }) => {
        if (!cancelled) setRev(json.data?.revenue ?? {});
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const registered = rev?.registered ?? 0;
  const checkouts = rev?.checkoutsStarted30d ?? 0;
  const paid = rev?.paidOrders30d ?? 0;

  const tiles: { label: string; value: string | number; target?: DrillTarget; tone: string }[] = [
    { label: t('admin.kpi.paying'), value: rev?.paying ?? 0, target: { kind: 'payers' }, tone: 'text-neo-lime' },
    { label: t('admin.kpi.trialing'), value: rev?.trialing ?? 0, target: { kind: 'payers' }, tone: 'text-neo-cyan' },
    { label: t('admin.kpi.granted'), value: rev?.granted ?? 0, target: { kind: 'payers' }, tone: 'text-neo-purple' },
    { label: t('admin.kpi.offerwall'), value: `$${(rev?.offerwallUsd30d ?? 0).toFixed(2)}`, tone: 'text-neo-white' },
  ];

  const steps: { label: string; value: number; rate?: string; target?: DrillTarget }[] = [
    { label: t('admin.kpi.stepRegistered'), value: registered, target: { kind: 'signups' } },
    { label: t('admin.kpi.stepCheckout'), value: checkouts, rate: pct(checkouts, registered), target: { kind: 'checkouts' } },
    { label: t('admin.kpi.stepPaid'), value: paid, rate: pct(paid, checkouts), target: { kind: 'payers' } },
  ];

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-1">
        <DollarSign className="w-4 h-4 text-neo-lime" />
        {t('admin.kpi.revenueTitle')}
      </h3>
      <p className="text-xs text-slate-500 mb-3">{t('admin.kpi.revenueNote')}</p>

      {failed ? (
        <p data-testid="revenue-error" className="text-sm text-red-400 py-4">{t('admin.activity.error')}</p>
      ) : rev === null ? (
        <div data-testid="revenue-skeleton" className="h-28 rounded bg-neo-navy-elevated/30 animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {tiles.map((tile) => (
              <button
                key={tile.label}
                type="button"
                disabled={!tile.target}
                onClick={() => tile.target && setDrill(tile.target)}
                className={cn(
                  'text-start rounded-neo border-2 border-neo-cream/40 p-3 transition-colors',
                  tile.target ? 'hover:border-neo-lime cursor-pointer' : 'cursor-default',
                )}
              >
                <div className="text-xs text-slate-400">{tile.label}</div>
                <div className={cn('text-2xl font-neo-display font-bold', tile.tone)}>{tile.value}</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {steps.map((step) => (
              <button
                key={step.label}
                type="button"
                onClick={() => step.target && setDrill(step.target)}
                className="flex-1 text-start rounded-neo border-2 border-neo-cream/40 hover:border-neo-cyan p-3 transition-colors"
              >
                <div className="text-xs text-slate-400">{step.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-neo-display font-bold text-neo-white">{step.value}</span>
                  {step.rate && <span className="text-xs text-neo-cyan">{step.rate}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <DrilldownDialog target={drill} authToken={authToken} onClose={() => setDrill(null)} />
    </div>
  );
}
