'use client';

import Link from 'next/link';
import { Sparkles, Gift } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

function formatDate(iso: string | null, language: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(DATE_LOCALE[language] || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * The plan, at a glance, in the dashboard header.
 *
 * A teacher on Pro — paid or gifted — sees a lime PRO chip with the date it runs
 * to; a free teacher sees a plain "Free plan" chip that is also the way to
 * upgrade. Both states are explicit on purpose: a gifted teacher should be able
 * to SEE the gift took, and a free teacher should never wonder which plan they
 * are on. Nothing renders while the entitlement is unknown (no flash, no false
 * upsell).
 */
export function TeacherPlanBadge({ className }: { className?: string }) {
  const { t, language } = useLanguage();
  const { hasPro, loading, source, periodEnd, grant, grantExpired } = useTeacherPro();

  if (loading) return null;

  if (hasPro) {
    const isGift = source === 'admin_grant';
    const until = formatDate(grant?.expires_at ?? periodEnd, language);
    return (
      <div
        data-testid="teacher-plan-badge"
        data-plan="pro"
        className={cn(
          'inline-flex items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-3 py-1.5 shadow-hard-sm',
          className,
        )}
      >
        {isGift ? <Gift className="size-4 text-black" aria-hidden="true" /> : <Sparkles className="size-4 text-black" aria-hidden="true" />}
        <span className="font-neo-display text-sm font-black uppercase tracking-wide text-black">{t('teacher.plan.pro')}</span>
        {until && (
          <span className="hidden text-xs font-bold text-black/70 sm:inline">
            {isGift ? t('teacher.plan.giftedUntil', { date: until }) : t('teacher.plan.renewsOn', { date: until })}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={`/${language}/teacher/upgrade`}
      data-testid="teacher-plan-badge"
      data-plan="free"
      className={cn(
        'inline-flex items-center gap-2 rounded-neo border-2 border-black/40 bg-neo-navy-light px-3 py-1.5 text-neo-white/80',
        'hover:border-neo-lime hover:text-neo-white transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime',
        className,
      )}
    >
      <span className="font-neo-display text-sm font-black uppercase tracking-wide">
        {grantExpired ? t('teacher.plan.giftEnded') : t('teacher.plan.free')}
      </span>
      <span className="text-xs font-bold text-neo-lime underline underline-offset-2">{t('teacher.plan.upgrade')}</span>
    </Link>
  );
}

export default TeacherPlanBadge;
