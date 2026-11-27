'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { landingButtonClass } from '@/components/landing/kit';
import { cn } from '@/lib/utils';

const CARD = 'flex flex-col gap-3 rounded-neo-lg border-3 border-neo-black bg-neo-cream p-5 text-neo-black shadow-hard-xl sm:p-7';
const TITLE = 'font-neo-display text-xl font-bold leading-tight sm:text-2xl';
const SMALL_BTN = 'min-h-12 px-5 py-2 text-base';

/**
 * The teacher-access and district asks as one closing pair. Fires the same
 * `education_upsell_impression` / `landing_cta_clicked` payloads the shared
 * TeacherAccessCTA and DistrictUpsellStrip send, so funnels keep counting.
 */
export function EducationTeacherCtas({
  showTeacherCta,
  showUpsell,
  hideTeacherLead,
}: {
  showTeacherCta: boolean;
  showUpsell: boolean;
  hideTeacherLead: boolean;
}) {
  const { t, language } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);
  const showLead = showUpsell && !hideTeacherLead;

  useEffect(() => {
    const el = ref.current;
    if (!el || fired.current) return;
    const ctas = [
      ...(showTeacherCta ? ['teacher_individual'] : []),
      ...(showLead ? ['teacher_individual'] : []),
      ...(showUpsell ? ['district_upsell'] : []),
    ];
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      try {
        for (const cta of ctas) trackGrowthEvent('education_upsell_impression', { cta });
      } catch {}
    };
    if (typeof IntersectionObserver === 'undefined') return fire();
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && (e.intersectionRatio === undefined || e.intersectionRatio >= 0.5))) {
          io.disconnect();
          fire();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showTeacherCta, showLead, showUpsell]);

  if (!showTeacherCta && !showUpsell) return null;
  const click = (cta: string) => () => trackGrowthEvent('landing_cta_clicked', { cta });
  const districtLink = (
    <Link
      data-lc-cta="for_schools"
      href={`/${language}/education/for-schools`}
      onClick={click('district_upsell')}
      className={cn(landingButtonClass('secondary'), SMALL_BTN, 'self-start')}
    >
      {t('education.landing.districtCta.button')}
    </Link>
  );

  return (
    <div ref={ref} className="grid gap-4 lg:grid-cols-2">
      {showTeacherCta && (
        <aside className={CARD}>
          <h2 className={TITLE}>{t('education.landing.cta.title')}</h2>
          <p className="leading-relaxed">{t('education.landing.cta.body')}</p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              data-lc-cta="signup"
              href={`/${language}/education/access`}
              onClick={click('teacher_individual')}
              className={cn(landingButtonClass('primary'), SMALL_BTN)}
            >
              {t('education.landing.cta.button')}
            </Link>
            <Link
              data-testid="teacher-pro-trial-landing-cta"
              data-lc-cta="pro_trial"
              href={`/${language}/teacher/upgrade`}
              onClick={click('teacher_pro_trial')}
              className={cn(landingButtonClass('dark'), SMALL_BTN)}
            >
              {t('teacher.subscription.startTrial')}
            </Link>
          </div>
          {!showUpsell && (
            <div className="mt-2 flex flex-col gap-2 border-t-2 border-neo-black/15 pt-4">
              <p className="text-sm font-bold">{t('education.landing.districtCta.title')}</p>
              {districtLink}
            </div>
          )}
        </aside>
      )}
      {showLead && (
        <aside className={CARD}>
          <h3 className={TITLE}>{t('education.landing.teacherLeadCta.title')}</h3>
          <p className="leading-relaxed">{t('education.landing.teacherLeadCta.body')}</p>
          <Link
            href={`/${language}/education/access`}
            onClick={click('teacher_individual')}
            className={cn(landingButtonClass('primary'), SMALL_BTN, 'self-start')}
          >
            {t('education.landing.teacherLeadCta.button')}
          </Link>
        </aside>
      )}
      {showUpsell && (
        <aside className={cn(CARD, 'bg-neo-purple')}>
          <h3 className={TITLE}>{t('education.landing.districtCta.title')}</h3>
          <p className="leading-relaxed">{t('education.landing.districtCta.body')}</p>
          {districtLink}
        </aside>
      )}
    </div>
  );
}
