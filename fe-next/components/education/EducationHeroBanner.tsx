'use client';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

interface Props {
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
}

const HERO_IMAGES: Record<string, { webp: string; jpg: string }> = {
  en: { webp: '/images/education-hero-en.webp', jpg: '/images/education-hero-en.jpg' },
  he: { webp: '/images/education-hero-he.webp', jpg: '/images/education-hero-he.jpg' },
  sv: { webp: '/images/education-hero-sv.webp', jpg: '/images/education-hero-sv.jpg' },
  ja: { webp: '/images/education-hero-ja.webp', jpg: '/images/education-hero-ja.jpg' },
  es: { webp: '/images/education-hero-es.webp', jpg: '/images/education-hero-es.jpg' },
};

/**
 * Reusable education hero banner with locale-specific hero images.
 * Uses <picture> for webp + jpg fallback.
 * Overlays dark gradient + text on top.
 * Scroll-reveal animation with reduced-motion support.
 */
export function EducationHeroBanner({ title, subtitle, cta }: Props) {
  const { language } = useLanguage();
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  const imageSet = HERO_IMAGES[language] ?? HERO_IMAGES.en;

  return (
    <section ref={ref} className="relative overflow-hidden rounded-neo border-neo-thick border-neo-white/20 shadow-hard-lg">
      {/* Picture element for webp + jpg fallback */}
      <picture className="block w-full">
        <source srcSet={imageSet.webp} type="image/webp" />
        <img
          src={imageSet.jpg}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      </picture>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-neo-navy/90 to-neo-navy/70" aria-hidden />

      {/* Content */}
      <div
        className={`relative mx-auto max-w-2xl px-6 py-12 sm:py-16 transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h2 className="text-3xl sm:text-4xl font-neo-display font-black uppercase text-neo-white leading-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-3 text-base sm:text-lg text-neo-white max-w-xl">
            {subtitle}
          </p>
        )}

        {cta && (
          <div className="mt-6">
            <a
              href={cta.href}
              className="inline-flex items-center gap-2 px-5 py-3 bg-neo-lime text-neo-navy font-bold rounded-neo shadow-hard hover:shadow-hard-lg transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {cta.label}
              <span aria-hidden>→</span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
