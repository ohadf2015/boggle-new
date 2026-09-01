'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { isReducedMotionPreferred } from '@/utils/accessibility';
import { locales } from '@/lib/i18n';
import { EducationModeMock } from './EducationModeMock';
import Mascot from '@/components/ui/Mascot';

/**
 * The hero's language *count* is derived from the shipped locale list rather than
 * written into the copy. It read "Built natively for 5 languages" while
 * `lib/i18n.js` already shipped `ru`, so a Russian teacher landed on
 * /ru/education and was told the product didn't speak their language.
 *
 * The eyebrow's language *list* stays hand-written per locale on purpose: every
 * non-English locale names the languages in its own words ("עברית, אנגלית…",
 * "英語・ヘブライ語…"), which reads far better than injecting uppercase ASCII
 * codes. `EducationHero.contrast.test.ts` carries a tripwire on
 * `locales.length` so locale number seven has to revisit that copy instead of
 * silently shipping a short list.
 */
const LANGUAGE_COUNT = String(locales.length);

/**
 * Design tokens (from frontend-design skill):
 * - Hero: dark neo-navy background with neo-lime primary CTA
 * - Single primary CTA: oversized bg-neo-lime button with shadow-hard-xl, an
 *   animated arrow, and a reassurance note. We deliberately keep ONE CTA so the
 *   teacher's next action is unmistakable (clicks tracked via growth analytics).
 * - Right column shows EducationModeMock — a live "see it in action" preview —
 *   so the page demonstrates the product instead of needing a second CTA.
 * - Decorative dots: neo-lime/neo-pink at low opacity for personality
 *
 * Entry: GSAP timeline cascades eyebrow → h1 → sub → CTA, then floats the
 * background dots on a slow loop. Decorative only; respects reduced-motion.
 */

export function EducationHero() {
  const { t, language } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dots = dotsRef.current;
    if (!root) return;

    const rm = isReducedMotionPreferred();
    const targets = root.querySelectorAll<HTMLElement>('[data-hero-item]');
    if (targets.length === 0) return;

    if (rm) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline();
    tl.set(targets, { opacity: 0, y: 24 });
    tl.to(targets, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.1,
    });

    let dotsTween: gsap.core.Tween | null = null;
    if (dots) {
      dotsTween = gsap.to(dots, {
        backgroundPosition: '40px 30px, -40px -30px',
        duration: 14,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });
    }

    return () => {
      tl.kill();
      dotsTween?.kill();
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-neo-navy">
      {/* Decorative background dots */}
      <div
        ref={dotsRef}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(191, 255, 0, 0.08), transparent 50%), ' +
            'radial-gradient(circle at 80% 70%, rgba(255, 20, 147, 0.08), transparent 50%)',
        }}
      />

      <div
        ref={rootRef}
        className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:py-20 lg:grid-cols-2 lg:gap-12"
      >
        {/* Left column: copy + single CTA */}
        <div className="text-center lg:text-start">
          <p
            data-hero-item
            className="text-sm font-bold uppercase tracking-wider text-neo-pink"
          >
            {t('education.landing.hero.eyebrow')}
          </p>
          <h1
            data-hero-item
            className="mt-3 text-4xl sm:text-5xl font-neo-display font-black leading-tight text-neo-cream md:text-6xl"
          >
            {t('education.landing.hero.h1')}
          </h1>
          <p
            data-hero-item
            className="education-hero-sub mt-5 text-base sm:text-lg text-neo-cream/80"
          >
            {t('education.landing.hero.sub', undefined, { count: LANGUAGE_COUNT })}
          </p>

          <div
            data-hero-item
            className="mt-8 flex flex-col items-center gap-3 lg:items-start"
          >
            <Link
              href={`/${language}/education/access`}
              onClick={() => trackLandingCtaClick('education_hero')}
              className="group inline-flex items-center gap-3 rounded-neo border-neo-thick border-neo-navy bg-neo-lime px-8 py-4 text-lg font-black uppercase tracking-wide text-neo-navy shadow-hard-xl transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-hard motion-safe:animate-pulse-subtle"
            >
              {t('education.landing.hero.cta_primary')}
              <span
                aria-hidden
                className="text-xl transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
              >
                →
              </span>
            </Link>
            <p className="text-xs font-bold uppercase tracking-wider text-neo-cream/70">
              {t('education.landing.hero.cta_note')}
            </p>
            <Link
              href={`/${language}/education/for-schools`}
              onClick={() => trackLandingCtaClick('hero_for_schools')}
              className="text-xs font-bold text-neo-cream/80 underline underline-offset-2 hover:text-neo-cream transition-colors"
            >
              {t('education.landing.hero.cta_schools')}
            </Link>
          </div>
        </div>

        {/* Right column: live product mock. No `order-*` here on purpose — the
            mock is already the second grid child, so it sits right on desktop
            by source order, and any unprefixed `order-first` would hoist it
            above the h1 and the CTA on every viewport under lg. */}
        <div data-hero-item className="relative">
          <EducationModeMock />
          {/* Lexi studying next to the live mock — the one genuinely animated
              element in the hero (scholar.webp is a 98-frame loop, not a still).
              `clipShape` is not decoration: scholar.webp has an OPAQUE dark
              background, so unclipped it punches a dark rectangle through the
              mock's leaderboard card. Clipped to a bordered circle it reads as a
              deliberate badge instead.
              Decorative and aria-hidden — the h1 carries the meaning, and the
              component's fallback alt is an untranslated English string.
              Hidden under sm so it never crowds the mock on a phone. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-6 -start-6 hidden sm:block"
          >
            <Mascot variant="scholar" size="md" clipShape="circle" clipBorder="lime" />
          </div>
        </div>
      </div>
    </section>
  );
}
