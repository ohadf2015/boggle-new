'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

export function TeacherAccessCTA() {
  const { t, language } = useLanguage();
  const containerRef = useRef<HTMLElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || firedRef.current) return;

    if (typeof IntersectionObserver === 'undefined') {
      firedRef.current = true;
      try {
        trackGrowthEvent('education_upsell_impression', { cta: 'teacher_individual' });
      } catch {}
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            !firedRef.current &&
            entry.isIntersecting &&
            (entry.intersectionRatio === undefined || entry.intersectionRatio >= 0.5)
          ) {
            firedRef.current = true;
            io.disconnect();
            try {
              trackGrowthEvent('education_upsell_impression', { cta: 'teacher_individual' });
            } catch {}
            break;
          }
        }
      },
      { threshold: 0.5 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <aside ref={containerRef} className="mx-auto my-12 max-w-3xl rounded-neo border-neo-thick border-neo-navy bg-neo-cream p-6 sm:p-8 shadow-hard-lg">
      <h2
        data-cta-item
        className="text-2xl font-neo-display font-black text-neo-navy"
      >
        {t('education.landing.cta.title')}
      </h2>
      <p data-cta-item className="mt-2 text-neo-navy/70">
        {t('education.landing.cta.body')}
      </p>
      <Link
        data-cta-item
        href={`/${language}/education/access`}
        onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'teacher_individual' })}
        className="mt-4 inline-block rounded-neo border-neo-thick border-neo-navy bg-neo-lime px-6 py-3 font-bold text-neo-navy shadow-hard-lg transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-hard"
      >
        {t('education.landing.cta.button')}
      </Link>
      <div data-cta-item className="mt-4 border-t border-neo-navy/20 pt-4">
        <p className="text-sm font-bold text-neo-navy">{t('education.landing.districtCta.title')}</p>
        <Link
          href={`/${language}/education/for-schools`}
          onClick={() => trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell' })}
          className="mt-1 inline-block text-sm font-bold text-neo-navy/70 underline underline-offset-2 transition-colors hover:text-neo-navy"
        >
          {t('education.landing.districtCta.button')} →
        </Link>
      </div>
    </aside>
  );
}
