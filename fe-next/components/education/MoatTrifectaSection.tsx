'use client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGsapReveal } from '@/lib/animation/useGsapReveal';

/**
 * Design: 3 cards with mode-specific accent colors (neo-lime, neo-cyan, neo-pink)
 * The h2/subtitle sit on the page's dark navy background — they must use light
 * text. The cards themselves are cream, so internal text stays navy.
 * GSAP staggers the heading, subtitle, then cards on scroll-in.
 */

const PILLARS = [
  { key: 'native_multilingual', accent: 'bg-neo-pink', borderAccent: 'border-neo-pink' },
  { key: 'local_inventory', accent: 'bg-neo-cyan', borderAccent: 'border-neo-cyan' },
  { key: 'ad_free', accent: 'bg-neo-lime', borderAccent: 'border-neo-lime' },
];

export function MoatTrifectaSection() {
  const { t } = useLanguage();
  const ref = useGsapReveal<HTMLDivElement>({
    selector: '[data-moat-item]',
    y: 28,
    stagger: 0.12,
    duration: 0.7,
  });

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div ref={ref}>
        <h2
          data-moat-item
          className="text-3xl font-neo-display font-black text-neo-white text-center"
        >
          {t('education.landing.moat.title')}
        </h2>
        <p
          data-moat-item
          className="mt-2 text-center text-neo-white"
        >
          {t('education.landing.moat.subtitle')}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <article
              key={p.key}
              data-moat-item
              className={`rounded-neo border-neo-thick ${p.borderAccent} bg-neo-cream p-6 shadow-hard-lg transition-transform hover:-translate-y-1`}
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
