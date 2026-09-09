'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Gift, BarChart3, FileText, Users, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import type { TeacherProGrant } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';

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
export function ProWelcomeCelebration({ grant, paid = false }: { grant: TeacherProGrant | null; paid?: boolean }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(() => paid || (!!grant && !grant.welcomed));
  const marked = useRef(false);

  // Paid can flip to true after mount: the dashboard keeps re-reading the
  // entitlement while Polar's webhook is still in flight.
  useEffect(() => {
    if (paid) setOpen(true);
  }, [paid]);

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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neo-navy/85 p-4" data-testid="pro-welcome-celebration">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-welcome-title"
        className={cn('relative w-full max-w-md rounded-neo border-3 border-black bg-neo-cream p-6 shadow-hard-lg', isRTL && 'rtl text-right')}
      >
        <button
          type="button"
          onClick={close}
          aria-label={t('common.close')}
          className="absolute top-3 end-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-neo-white shadow-hard-sm hover:-translate-y-0.5 transition-transform"
        >
          <X className="size-4" />
        </button>

        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-neo border-3 border-black bg-neo-lime shadow-hard">
          <Gift className="size-8 text-black" aria-hidden="true" />
        </div>
        <h2 id="pro-welcome-title" className="text-center font-neo-display text-2xl font-black text-black">
          {t('teacher.proWelcome.title')}
        </h2>
        <p className="mt-2 text-center text-sm font-bold text-black/70">
          {paid ? t('teacher.proWelcome.paidBody') : t('teacher.proWelcome.until', { date: until })}
        </p>

        {!paid && grant?.note && (
          <blockquote className="mt-4 rounded-neo border-2 border-black bg-neo-white p-3 text-sm italic text-black/80 border-s-4 border-s-neo-cyan">
            {grant.note}
          </blockquote>
        )}

        <ul className="mt-5 space-y-2">
          {perks.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-center gap-3 rounded-neo border-2 border-black bg-neo-white px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan">
                <Icon className="size-4 text-black" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-black">{t(`teacher.proWelcome.perk.${key}`)}</span>
            </li>
          ))}
        </ul>

        {paid ? (
          <p className="mt-4 text-center text-xs font-bold text-black/60">
            <Link href={`/${language}/teacher/profile`} className="underline underline-offset-2 hover:text-black">
              {t('teacher.proWelcome.manage')}
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-center text-xs font-bold text-black/60">{t('teacher.proWelcome.noCard')}</p>
        )}

        <button
          type="button"
          onClick={close}
          className="mt-5 w-full rounded-neo border-3 border-black bg-black py-3 font-neo-display text-base font-black text-neo-lime shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          {t('teacher.proWelcome.cta')}
        </button>
      </div>
    </div>
  );
}

export default ProWelcomeCelebration;
