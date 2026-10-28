'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FunnelRow {
  signupDay: string;
  utmCampaign: string;
  utmSource: string;
  signups: number;
  teachers: number;
  accessApproved: number;
  classroomCreated: number;
  firstStudent: number;
  firstRealRound: number;
  d1Eligible: number;
  d1Returned: number;
  d7Eligible: number;
  d7Returned: number;
}

/** One row of the paid-campaign funnel. Consent-free landings stay in the beacon; this is signups onward. */
export function PaidCampaignRow() {
  const { t } = useLanguage();
  const [rows, setRows] = useState<FunnelRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/insights/paid-campaign?days=14')
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || 'failed');
        setRows(Array.isArray(body?.rows) ? body.rows : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'failed'));
  }, []);

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4" data-testid="paid-campaign-row">
      <h3 className="text-neo-white font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-neo-lime" />
        {t('admin.insights.paidCampaign', 'Paid campaign funnel')}
      </h3>
      <p className="text-slate-500 text-[11px] mb-3">
        {t('admin.insights.paidCampaignHint', 'utm_medium=paid, signup day in Israel time. Read-only. Landings are the cookieless lander_cta_clicked beacon, not this table.')}
      </p>
      {error && <p className="text-neo-pink text-xs">{error}</p>}
      {!error && !rows && <p className="text-slate-400 text-xs">{t('common.loading', 'Loading…')}</p>}
      {rows && rows.length === 0 && <p className="text-slate-400 text-xs">{t('admin.noData', 'No data available')}</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-neo-white">
            <thead className="text-slate-400 uppercase">
              <tr>
                {([
                  ['day', 'Day'],
                  ['campaign', 'Campaign'],
                  ['src', 'Src'],
                  ['signups', 'Signups'],
                  ['teachers', 'Teachers'],
                  ['approved', 'Approved'],
                  ['class', 'Class'],
                  ['student', 'Student'],
                  ['round', '2+ round'],
                  ['d1', 'D1'],
                  ['d7', 'D7'],
                ] as const).map(([key, fallback]) => (
                  <th key={key} className="px-1 py-1 font-bold">{t(`admin.insights.paidCol.${key}`, fallback)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.signupDay}-${r.utmCampaign}-${r.utmSource}`} className="border-t border-white/10">
                  <td className="px-1 py-1 font-mono">{r.signupDay}</td>
                  <td className="px-1 py-1 font-mono">{r.utmCampaign}</td>
                  <td className="px-1 py-1">{r.utmSource}</td>
                  <td className="px-1 py-1">{r.signups}</td>
                  <td className="px-1 py-1">{r.teachers}</td>
                  <td className="px-1 py-1">{r.accessApproved}</td>
                  <td className="px-1 py-1">{r.classroomCreated}</td>
                  <td className="px-1 py-1">{r.firstStudent}</td>
                  <td className="px-1 py-1">{r.firstRealRound}</td>
                  <td className="px-1 py-1">{r.d1Returned}/{r.d1Eligible}</td>
                  <td className="px-1 py-1">{r.d7Returned}/{r.d7Eligible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
