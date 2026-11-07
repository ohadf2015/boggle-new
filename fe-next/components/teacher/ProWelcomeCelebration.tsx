'use client';

import { isCheckoutRedirectPending } from '@/lib/education/checkoutReturn';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, BarChart3, FileText, Users, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import type { TeacherProGrant } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';
import { NB_DIALOG_BODY, NB_DIALOG_CLOSE, NB_DIALOG_FOOTER, NB_DIALOG_TITLE, NB_OVERLAY_LAYER, NB_OVERLAY_PANEL, nbDialogHeaderClass } from '@/components/teacher/nb/nbDialogStyles';
import { NB_BLOCK, NB_PRIMARY } from '@/components/teacher/nb/nbStyles';
import { trackEduProCheckoutSuccessSeen } from '@/lib/education/proFunnelTelemetry';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

/**
 * The one-time "you're on Teacher Pro" moment.
 *
 * Two ways in, one dialog:
 * - `grant`: a complimentary admin grant that has not been welcomed yet. The
 *   seen-marker is written the moment it RENDERS (pitfall class 1: persist at
 *   show-time, never at dismiss-time) so a reload without dismissing cannot
 *   re-pop it.
 * - `paid`: the teacher just came back from Polar checkout. No server marker
 *   exists for that, so closing strips `?checkout=success` from the URL and a
 *   reload stays quiet. The copy differs: a paying teacher has a card on file
 *   and must be told where to manage or cancel it — the gifted "no card, ends
 *   on {date}" lines would be a lie for her.
 */
export function ProWelcomeCelebration({ grant, paid = false, onReturnPage = false }: { grant: TeacherProGrant | null; paid?: boolean; onReturnPage?: boolean }) {
  const { t, language } = useLanguage();
  // The landing is moving on to the page checkout started from; that page celebrates instead.
  const leaving = paid && !onReturnPage && typeof window !== 'undefined' && isCheckoutRedirectPending(window.sessionStorage, window.location.pathname);
  const [open, setOpen] = useState(() => (paid && !leaving) || (!!grant && !grant.welcomed));
  const marked = useRef(false);

  // Paid can flip to true after mount: the dashboard keeps re-reading the
  // entitlement while Polar's webhook is still in flight.
  useEffect(() => {
    if (paid && !leaving) setOpen(true);
  }, [paid, leaving]);

  useEffect(() => {
    if (!open || marked.current) return;
    marked.current = true;
    void fireConfetti({ particleCount: 90, spread: 80 });
    if (!paid) {
      fetch('/api/subscription/pro-welcome-seen', { method: 'POST' }).catch(() => {
        // Best effort — worst case the teacher sees the celebration once more.
      });
    }
  }, [open, paid]);

  // Funnel: the teacher saw a PAID checkout land. Its own ref — `marked` can
  // already be spent by a grant that opened before `paid` flipped. A comp grant
  // is a gift, not a conversion, so it never counts. The tracker dedupes reloads.
  const successTracked = useRef(false);
  useEffect(() => {
    if (!paid || leaving || successTracked.current) return;
    successTracked.current = true;
    try {
      trackEduProCheckoutSuccessSeen();
    } catch {
      /* analytics must never block the celebration */
    }
  }, [paid, leaving]);

  const close = () => {
    setOpen(false);
    if (paid && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState(null, '', url);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close only reads `paid`, stable for a mount
  }, [open]);

  if (!open || (!grant && !paid)) return null;

  const until = grant
    ? new Date(grant.expires_at).toLocaleDateString(DATE_LOCALE[language] || 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';
  const isRTL = language === 'he';

  const perks = [
    { icon: BarChart3, key: 'analytics' },
    { icon: FileText, key: 'reports' },
    { icon: Users, key: 'unlimited' },
  ] as const;

  return (
    <div className={NB_OVERLAY_LAYER} data-testid="pro-welcome-celebration">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-welcome-title"
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(NB_OVERLAY_PANEL, 'sm:max-w-md', isRTL && 'rtl')}
      >
        <div className={nbDialogHeaderClass('lime')}>
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-cream shadow-hard">
            <Gift className="size-6 text-neo-black" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="pro-welcome-title" className={NB_DIALOG_TITLE}>
              {t('teacher.proWelcome.title')}
            </h2>
            <p className="mt-1 font-neo-body text-sm font-bold">
              {paid ? t('teacher.proWelcome.paidBody') : t('teacher.proWelcome.until', { date: until })}
            </p>
          </div>
          <button type="button" onClick={close} aria-label={t('common.close')} className={NB_DIALOG_CLOSE}>
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        <div className={NB_DIALOG_BODY}>
          {!paid && grant?.note && (
            <blockquote className="mb-4 rounded-neo border-[3px] border-s-[6px] border-neo-cream/50 border-s-neo-cyan bg-neo-navy-light p-3 font-neo-body text-sm italic text-neo-cream/90">
              {grant.note}
            </blockquote>
          )}
          <ul className="space-y-2.5">
            {perks.map(({ icon: Icon, key }) => (
              <li key={key} className={cn('flex items-center gap-3 rounded-neo-lg border-[3px] px-3 py-2.5 shadow-hard', NB_BLOCK.navy)}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan">
                  <Icon className="size-4 text-neo-black" aria-hidden="true" />
                </span>
                <span className="font-neo-body text-sm font-bold">{t(`teacher.proWelcome.perk.${key}`)}</span>
              </li>
            ))}
          </ul>
          {paid ? (
            <p className="mt-4 text-center font-neo-body text-xs font-bold text-neo-cream/75">
              <Link href={`/${language}/teacher/profile`} className="underline decoration-2 underline-offset-4 hover:text-neo-cream">
                {t('teacher.proWelcome.manage')}
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-center font-neo-body text-xs font-bold text-neo-cream/75">{t('teacher.proWelcome.noCard')}</p>
          )}
        </div>

        <div className={NB_DIALOG_FOOTER}>
          <button type="button" onClick={close} className={cn(NB_PRIMARY, 'w-full')}>
            {t('teacher.proWelcome.cta')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProWelcomeCelebration;
