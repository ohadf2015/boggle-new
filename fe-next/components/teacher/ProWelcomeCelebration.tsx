'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift, BarChart3, FileText, Users, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fireConfetti } from '@/utils/confettiUtils';
import type { TeacherProGrant } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US', he: 'he-IL', sv: 'sv-SE', ja: 'ja-JP', es: 'es-ES', ru: 'ru-RU',
};

/**
 * The one-time "you're on Teacher Pro" moment for a teacher who was GIFTED Pro.
 *
 * Shown once, on the first dashboard open after the grant. The seen-marker is
 * written the moment this renders — not when it is dismissed — so a reload
 * without dismissing cannot re-pop it (recurring pitfall class 1: persist at
 * show-time). `welcomed` comes from the DB, the single source of truth; there
 * is deliberately no localStorage twin.
 */
export function ProWelcomeCelebration({ grant }: { grant: TeacherProGrant | null }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(() => !!grant && !grant.welcomed);
  const marked = useRef(false);

  useEffect(() => {
    if (!open || marked.current) return;
    marked.current = true;
    void fireConfetti({ particleCount: 90, spread: 80 });
    fetch('/api/subscription/pro-welcome-seen', { method: 'POST' }).catch(() => {
      // Best effort: worst case the teacher sees this once more next time.
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !grant) return null;

  const until = new Date(grant.expires_at).toLocaleDateString(DATE_LOCALE[language] || 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
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
          onClick={() => setOpen(false)}
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
          {t('teacher.proWelcome.until', { date: until })}
        </p>

        {grant.note && (
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

        <p className="mt-4 text-center text-xs font-bold text-black/60">{t('teacher.proWelcome.noCard')}</p>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-5 w-full rounded-neo border-3 border-black bg-black py-3 font-neo-display text-base font-black text-neo-lime shadow-hard hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan"
        >
          {t('teacher.proWelcome.cta')}
        </button>
      </div>
    </div>
  );
}

export default ProWelcomeCelebration;
