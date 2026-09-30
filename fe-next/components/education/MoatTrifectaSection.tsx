'use client';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Design: 3 cards with mode-specific accent colors (neo-lime, neo-cyan, neo-pink)
 * The h2/subtitle sit on the page's dark navy background — they must use light
 * text. The cards themselves are cream, so internal text stays navy.
 */

const PILLARS = [
  { key: 'native_multilingual', accent: 'bg-neo-pink', ink: 'text-neo-black' },
  { key: 'local_inventory', accent: 'bg-neo-cyan', ink: 'text-neo-navy' },
  { key: 'ad_free', accent: 'bg-neo-lime', ink: 'text-neo-navy' },
];

export function MoatTrifectaSection() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
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
              className="rounded-neo border-2 border-neo-navy bg-neo-cream p-6"
            >
              <div className={`mb-4 inline-block rounded-full ${p.accent} px-3 py-1 text-xs font-bold uppercase ${p.ink}`}>
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
    </section>
  );
}
