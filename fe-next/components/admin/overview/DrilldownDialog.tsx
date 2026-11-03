'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

export type DrillKind = 'signups' | 'payers' | 'checkouts';

export interface DrillTarget {
  kind: DrillKind;
  week?: string;
}

type Row = Record<string, string | number | boolean | null>;

const COLUMNS: Record<DrillKind, { key: string; labelKey: string }[]> = {
  signups: [
    { key: 'name', labelKey: 'admin.kpi.colName' },
    { key: 'created_at', labelKey: 'admin.kpi.colJoined' },
    { key: 'country', labelKey: 'admin.kpi.colCountry' },
    { key: 'source', labelKey: 'admin.kpi.colSource' },
    { key: 'games', labelKey: 'admin.kpi.colGames' },
  ],
  payers: [
    { key: 'name', labelKey: 'admin.kpi.colName' },
    { key: 'source', labelKey: 'admin.kpi.colSource' },
    { key: 'status', labelKey: 'admin.kpi.colStatus' },
    { key: 'period_end', labelKey: 'admin.kpi.colRenews' },
  ],
  checkouts: [
    { key: 'name', labelKey: 'admin.kpi.colName' },
    { key: 'created_at', labelKey: 'admin.kpi.colJoined' },
    { key: 'mode', labelKey: 'admin.kpi.colMode' },
    { key: 'locale', labelKey: 'admin.kpi.colLocale' },
  ],
};

const TITLE_KEY: Record<DrillKind, string> = {
  signups: 'admin.kpi.drillSignups',
  payers: 'admin.kpi.drillPayers',
  checkouts: 'admin.kpi.drillCheckouts',
};

function cell(key: string, value: Row[string]): string {
  if (value === null || value === undefined || value === '') return '-';
  if (key === 'created_at' || key === 'period_end') return String(value).slice(0, 10);
  return String(value);
}

interface Props {
  target: DrillTarget | null;
  authToken: string;
  onClose: () => void;
}

export function DrilldownDialog({ target, authToken, onClose }: Props) {
  const { t, language } = useLanguage();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setRows(null);
    setFailed(false);
    const qs = new URLSearchParams({ kind: target.kind, ...(target.week ? { week: target.week } : {}) });
    fetch(`/api/admin/analytics/drilldown?${qs}`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: { data?: { rows?: Row[] } }) => {
        if (!cancelled) setRows(json.data?.rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [target, authToken]);

  const cols = target ? COLUMNS[target.kind] : [];

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl xl:max-w-3xl">
        <div className="p-4">
          <DialogTitle className="text-lg font-neo-display mb-1">
            {target && t(TITLE_KEY[target.kind])}
            {target?.week ? ` ${target.week}` : ''}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mb-3">
            {rows ? `${rows.length}` : ''}
          </DialogDescription>

          {failed ? (
            <p data-testid="drill-error" className="text-sm text-red-400 py-6">{t('admin.activity.error')}</p>
          ) : rows === null ? (
            <div data-testid="drill-skeleton" className="h-32 rounded bg-neo-navy-elevated/30 animate-pulse" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{t('admin.kpi.drillEmpty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-start">
                <thead>
                  <tr className="text-xs text-slate-400">
                    {cols.map((c) => (
                      <th key={c.key} className="py-1 pe-3 text-start font-medium">{t(c.labelKey)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.id ?? i}`} className="border-t border-neo-cream/10">
                      {cols.map((c) => (
                        <td key={c.key} className="py-1.5 pe-3">
                          {c.key === 'name' && r.id && target?.kind !== 'checkouts' ? (
                            <Link href={`/${language}/admin/players/${r.id}`} className="hover:text-neo-cyan">
                              {cell(c.key, r[c.key])}
                            </Link>
                          ) : (
                            cell(c.key, r[c.key])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
