'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

/**
 * Design: 3 cards with mode-specific accent colors (neo-lime, neo-cyan, neo-pink)
 * Stagger: each card delays by 120ms from previous, driven by parent visibility
 */

const PILLARS = [
  { key: 'native_multilingual', accent: 'bg-neo-pink', borderAccent: 'border-neo-pink' },
  { key: 'local_inventory', accent: 'bg-neo-cyan', borderAccent: 'border-neo-cyan' },
  { key: 'ad_free', accent: 'bg-neo-lime', borderAccent: 'border-neo-lime' },
];

export function MoatTrifectaSection() {
  const { t } = useLanguage();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div ref={ref}>
        <h2
          className={`text-3xl font-neo-display font-black text-neo-navy text-center transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {t('education.landing.moat.title')}
        </h2>
        <p
          className={`mt-2 text-center text-neo-navy/60 transition-all duration-700 ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: visible ? '80ms' : '0ms' }}
        >
          {t('education.landing.moat.subtitle')}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article
              key={p.key}
              style={{
                transitionDelay: visible ? `${200 + i * 120}ms` : '0ms',
              }}
              className={`rounded-neo border-neo-thick ${p.borderAccent} bg-neo-cream p-6 shadow-hard-lg transition-all duration-700 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <div className={`mb-4 inline-block rounded-full ${p.accent} px-3 py-1 text-xs font-bold text-neo-navy uppercase`}>
                {t(`education.landing.moat.${p.key}.tag`)}
              </div>
              <h3 className="text-lg font-neo-display font-black text-neo-navy">
                {t(`education.landing.moat.${p.key}.title`)}
              </h3>
              <p className="mt-2 text-sm text-neo-navy/70">
                {t(`education.landing.moat.${p.key}.body`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
