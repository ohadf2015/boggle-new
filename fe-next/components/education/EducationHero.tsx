'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { isReducedMotionPreferred } from '@/utils/accessibility';

/**
 * Design tokens (from frontend-design skill):
 * - Hero uses neo-cream/neo-navy gradient for warmth + professional tone
 * - Primary CTA: bg-neo-lime with shadow-hard (pixel-perfect shadow)
 * - Secondary CTA: border-neo + dark navy text
 * - Decorative dots: neo-lime/neo-pink at low opacity for personality
 *
 * Entry: GSAP timeline cascades eyebrow → h1 → sub → CTAs, then floats the
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
    <section className="relative overflow-hidden bg-gradient-to-b from-neo-cream to-neo-white">
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
        className="relative mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center"
      >
        <p
          data-hero-item
          className="text-sm font-bold uppercase tracking-wider text-neo-pink"
        >
          {t('education.landing.hero.eyebrow')}
        </p>
        <h1
          data-hero-item
          className="mt-3 text-4xl sm:text-5xl font-neo-display font-black leading-tight text-neo-navy md:text-6xl"
        >
          {t('education.landing.hero.h1')}
        </h1>
        <p
          data-hero-item
          className="education-hero-sub mt-5 text-base sm:text-lg text-neo-navy/70"
        >
          {t('education.landing.hero.sub')}
        </p>

        <div
          data-hero-item
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
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
