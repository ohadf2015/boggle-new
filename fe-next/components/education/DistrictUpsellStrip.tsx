'use client';
import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';

const TEACHER_MAILTO =
  'mailto:lexiclash.game@gmail.com?subject=Teacher%20Interest%20-%20Classroom%20Tools';
const DISTRICT_MAILTO =
  'mailto:lexiclash.game@gmail.com?subject=District%20Pricing%20Inquiry';

export function DistrictUpsellStrip() {
  const { t } = useLanguage();

  useEffect(() => {
    trackGrowthEvent('education_upsell_impression', { cta: 'teacher_individual' });
    trackGrowthEvent('education_upsell_impression', { cta: 'district_upsell' });
  }, []);

  return (
    <div className="mx-auto my-8 max-w-3xl flex flex-col gap-4">
      {/* Individual teacher CTA */}
      <aside className="rounded-neo border-neo border-neo-lime/60 bg-neo-navy-light px-6 py-5 shadow-hard">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-neo-display font-black text-neo-lime">
              {t('education.landing.teacherLeadCta.title')}
            </h3>
            <p className="mt-1 text-sm text-neo-white/80">
              {t('education.landing.teacherLeadCta.body')}
            </p>
          </div>
          <a
            href={TEACHER_MAILTO}
            onClick={() =>
              trackGrowthEvent('landing_cta_clicked', { cta: 'teacher_individual' })
            }
            className="shrink-0 rounded-neo border-neo border-neo-lime bg-neo-lime/20 px-5 py-2.5 font-bold text-neo-white shadow-hard-sm transition-all hover:bg-neo-lime/30 hover:shadow-hard"
          >
            {t('education.landing.teacherLeadCta.button')}
          </a>
        </div>
      </aside>

      {/* District / bulk CTA */}
      <aside className="rounded-neo border-neo border-neo-purple/60 bg-neo-navy-light px-6 py-5 shadow-hard">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-neo-display font-black text-neo-purple">
              {t('education.landing.districtCta.title')}
            </h3>
            <p className="mt-1 text-sm text-neo-white/80">
              {t('education.landing.districtCta.body')}
            </p>
          </div>
          <a
            href={DISTRICT_MAILTO}
            onClick={() =>
              trackGrowthEvent('landing_cta_clicked', { cta: 'district_upsell' })
            }
            className="shrink-0 rounded-neo border-neo border-neo-purple bg-neo-purple/20 px-5 py-2.5 font-bold text-neo-white shadow-hard-sm transition-all hover:bg-neo-purple/30 hover:shadow-hard"
          >
            {t('education.landing.districtCta.button')}
          </a>
        </div>
      </aside>
    </div>
  );
}
