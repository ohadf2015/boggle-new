'use client';
import { useLanguage } from '@/contexts/LanguageContext';

const HERO_IMAGES: Record<string, { webp: string; jpg: string }> = {
  en: { webp: '/images/education-hero-en.webp', jpg: '/images/education-hero-en.jpg' },
  he: { webp: '/images/education-hero-he.webp', jpg: '/images/education-hero-he.jpg' },
  sv: { webp: '/images/education-hero-sv.webp', jpg: '/images/education-hero-sv.jpg' },
  ja: { webp: '/images/education-hero-ja.webp', jpg: '/images/education-hero-ja.jpg' },
  es: { webp: '/images/education-hero-es.webp', jpg: '/images/education-hero-es.jpg' },
  // No bespoke Russian asset shipped — reuse the English hero rather than 404.
  ru: { webp: '/images/education-hero-en.webp', jpg: '/images/education-hero-en.jpg' },
};

/**
 * Decorative hero image strip, rendered above the page's real H1. It used to
 * carry its own heading/subtitle/CTA, built from the exact same copy as the
 * `<header>` a few lines below it in `EducationLandingTemplate` — every page
 * that had a banner showed the same headline and subtitle twice in a row. The
 * H1 already carries the meaning, so this stays image-only.
 *
 * Also renders visible immediately rather than scroll-revealing from
 * `opacity-0`: it sits above the fold, right next to the (also
 * never-opacity-0) H1 — see `.claude/rules/60-recurring-pitfalls.md` Class 5.
 */
export function EducationHeroBanner() {
  const { language } = useLanguage();
  const imageSet = HERO_IMAGES[language] ?? HERO_IMAGES.en;

  return (
    <section className="relative overflow-hidden rounded-neo border-neo-thick border-neo-white/20 shadow-hard-lg">
      <picture className="block w-full">
        <source srcSet={imageSet.webp} type="image/webp" />
        <img
          src={imageSet.jpg}
          // Decorative: the H1 right below it already carries the meaning.
          alt=""
          width={1200}
          height={675}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>

      {/* Dark gradient overlay so the image reads as a stage-setting banner,
          not a competing focal point. */}
      <div className="absolute inset-0 bg-gradient-to-r from-neo-navy/90 to-neo-navy/70" aria-hidden />
    </section>
  );
}
