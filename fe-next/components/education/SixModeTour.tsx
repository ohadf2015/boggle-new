'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

/**
 * Design: 6 cards in 2x3 grid on desktop, 1 col on mobile
 * Accent colors mapped statically to avoid Tailwind purging
 * Stagger: each card animates with 80ms delay
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
  purple: 'text-neo-white',
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
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <h2 className="text-3xl font-neo-display font-black text-neo-navy">
        {t('education.landing.modes.title')}
      </h2>

      <div
        ref={ref}
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {MODES.map((m, i) => (
          <Link
            key={m.key}
            href={`/${language}${m.href}`}
            style={{
              transitionDelay: visible ? `${i * 80}ms` : '0ms',
            }}
            className={`group block rounded-neo border-neo-thick border-neo-navy bg-neo-cream p-5 shadow-hard-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-hard ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
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
            <p className="mt-2.5 text-xs font-bold text-neo-navy/50">
              {t('education.landing.modes.teaches')}: {t(`education.landing.modes.${m.key}.teaches`)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
