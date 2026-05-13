'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

/**
 * Design tokens (from frontend-design skill):
 * - Hero uses neo-cream/neo-navy gradient for warmth + professional tone
 * - Primary CTA: bg-neo-lime with shadow-hard (pixel-perfect shadow)
 * - Secondary CTA: border-neo + dark navy text
 * - Decorative dots: neo-lime/neo-pink at low opacity for personality
 */

export function EducationHero() {
  const { t, language } = useLanguage();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-neo-cream to-neo-white">
      {/* Decorative background dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(191, 255, 0, 0.08), transparent 50%), ' +
            'radial-gradient(circle at 80% 70%, rgba(255, 20, 147, 0.08), transparent 50%)',
        }}
      />

      <div
        ref={ref}
        className={`relative mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <p className="text-sm font-bold uppercase tracking-wider text-neo-pink">
          {t('education.landing.hero.eyebrow')}
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-neo-display font-black leading-tight text-neo-navy md:text-6xl">
          {t('education.landing.hero.h1')}
        </h1>
        <p className="education-hero-sub mt-5 text-base sm:text-lg text-neo-navy/70">
          {t('education.landing.hero.sub')}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${language}/education/access`}
            className="rounded-neo border-neo-thick border-neo-navy bg-neo-lime px-6 py-3 font-bold text-neo-navy shadow-hard-lg transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard"
          >
            {t('education.landing.hero.cta_primary')}
          </Link>
          <a
            href="#modes"
            className="rounded-neo border-neo-thick border-neo-navy bg-neo-cream px-6 py-3 font-bold text-neo-navy transition-all hover:bg-neo-white hover:shadow-hard-sm"
          >
            {t('education.landing.hero.cta_secondary')}
          </a>
        </div>
      </div>
    </section>
  );
}
