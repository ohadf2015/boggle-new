'use client';

import { Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PRO_COPY_PARAMS, type PlanCell, type PlanTableRow } from '@/lib/education/proFeatures';
import { LandingProPill } from './LandingProPill';

/** Free vs Pro, row by row: a number is a named limit, a check is included, a dash is not. */
export function ProFramingSectionTable({ rows }: { rows: readonly PlanTableRow[] }) {
  const { t } = useLanguage();

  const cell = (value: PlanCell, pro: boolean) => {
    if (value === null) {
      return <span className="font-black text-neo-yellow">{t('teacher.subscription.matrix.unlimited', 'Unlimited')}</span>;
    }
    if (typeof value === 'number') {
      return <bdi dir="ltr" className="font-black tabular-nums">{value}</bdi>;
    }
    if (value) {
      return (
        <>
          <Check className={`mx-auto size-5 ${pro ? 'text-neo-yellow' : 'text-neo-lime'}`} strokeWidth={3} aria-hidden="true" />
          <span className="sr-only">{t('teacher.subscription.matrix.included', 'Included')}</span>
        </>
      );
    }
    return (
      <>
        <span aria-hidden="true" className="font-black text-neo-white/60">—</span>
        <span className="sr-only">{t('teacher.subscription.matrix.notIncluded', 'Not included')}</span>
      </>
    );
  };

  return (
    <div className="w-full overflow-x-auto">
      <table data-testid="plan-table" className="w-full min-w-[18rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">{t('teacher.subscription.matrix.title', 'Compare plans')}</caption>
        <colgroup>
          <col />
          <col className="w-16 sm:w-24" />
          <col className="w-[4.75rem] sm:w-28" />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-neo-cream/40">
            <th scope="col" className="pb-2 text-start text-xs font-bold text-neo-white/70">
              {t('teacher.subscription.matrix.featureColumn', 'Feature')}
            </th>
            <th scope="col" className="pb-2 text-center align-bottom font-neo-display font-black text-neo-white">
              {t('education.landing.pro.freeTier')}
              <span className="block text-xs font-bold text-neo-white/70">
                <bdi dir="ltr">$0</bdi>
              </span>
            </th>
            <th scope="col" className="rounded-t-neo-sm bg-neo-yellow/10 px-1 pb-2 pt-1 text-center align-bottom">
              <LandingProPill label={t('eduPro.pill', 'Pro')} />
              <span className="mt-1 block text-xs font-bold text-neo-white">
                <bdi dir="ltr">{PRO_COPY_PARAMS.price}</bdi> {t('education.landing.pro.perMonth')}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-testid={`plan-row-${row.id}`} className="border-b border-neo-cream/15 last:border-b-0">
              <th scope="row" className="py-2 pe-2 text-start font-bold leading-snug text-neo-white [overflow-wrap:anywhere]">
                {t(row.labelKey, row.fallbackKey ? t(row.fallbackKey, row.fallback) : row.fallback)}
              </th>
              <td className="py-2 text-center text-neo-white">{cell(row.free, false)}</td>
              <td className="bg-neo-yellow/10 py-2 text-center text-neo-white">{cell(row.pro, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
