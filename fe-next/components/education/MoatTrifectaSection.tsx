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

        {/* The three pillars used to be a textbook equal triad — same size, same
            layout, no emphasis. Native multilingual is the strongest
            differentiator, so it gets a grid-span lead: a taller card beside the
            other two stacked in the second column, instead of three identical
            boxes in a row. */}
        <div className="mt-10 grid gap-6 md:grid-cols-2 md:grid-rows-2">
          {PILLARS.map((p, i) => {
            const lead = i === 0;
            return (
              <article
                key={p.key}
                data-moat-item
                className={`flex flex-col justify-center rounded-neo border-neo-thick ${p.borderAccent} bg-neo-cream shadow-hard-lg transition-transform hover:-translate-y-1 ${
                  lead ? 'row-span-2 p-8' : 'p-6'
                }`}
              >
                <div className={`mb-4 inline-block w-fit rounded-full ${p.accent} px-3 py-1 text-xs font-bold text-neo-navy uppercase`}>
                  {t(`education.landing.moat.${p.key}.tag`)}
                </div>
                <h3 className={`font-neo-display font-black text-neo-navy ${lead ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>
                  {t(`education.landing.moat.${p.key}.title`)}
                </h3>
                <p className={`text-neo-navy/70 ${lead ? 'mt-3 text-base' : 'mt-2 text-sm'}`}>
                  {t(`education.landing.moat.${p.key}.body`)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
