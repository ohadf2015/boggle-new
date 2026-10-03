'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Design: 6 cards in 2x3 grid on desktop, 1 col on mobile.
 * Accent colors mapped statically to avoid Tailwind purging.
 * Heading sits on the page dark-navy bg, so it must be light text;
 * cards keep their cream bg with navy text inside.
 */

const ACCENT_BG: Record<string, string> = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  purple: 'bg-neo-purple',
};

const ACCENT_TEXT: Record<string, string> = {
  lime: 'text-neo-navy',
  pink: 'text-neo-navy',
  cyan: 'text-neo-navy',
  purple: 'text-neo-black',
};

const MODES = [
  { key: 'classroom_game', href: '/education/classroom-game', accent: 'lime' },
  { key: 'vocab_duels', href: '/education/duels', accent: 'pink' },
  { key: 'brain_drills', href: '/practice/brain', accent: 'cyan' },
  { key: 'daily_wordhunt', href: '/daily', accent: 'purple' },
  { key: 'adventure', href: '/adventure', accent: 'lime' },
  { key: 'spelling_bee', href: '/education/spelling-bee-practice', accent: 'pink' },
] as const;

export function SixModeTour() {
  const { t, language } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h2
        data-mode-item
        className="text-3xl font-neo-display font-black text-neo-white"
      >
        {t('education.landing.modes.title')}
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m) => (
          <Link
            key={m.key}
            data-mode-item
            href={`/${language}${m.href}`}
            className="group block rounded-neo border-2 border-neo-navy bg-neo-cream p-5 transition-transform duration-150 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <div
              className={`mb-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                ACCENT_BG[m.accent]
              } ${ACCENT_TEXT[m.accent]}`}
            >
              {t(`education.landing.modes.${m.key}.tag`)}
            </div>
            <h3 className="text-sm font-neo-display font-black text-neo-navy">
              {t(`education.landing.modes.${m.key}.title`)}
            </h3>
            <p className="mt-2 text-xs text-neo-navy/70">
              {t(`education.landing.modes.${m.key}.body`)}
            </p>
            <p className="mt-2.5 text-xs font-bold text-neo-navy/80">
              {t('education.landing.modes.teaches')}: {t(`education.landing.modes.${m.key}.teaches`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
