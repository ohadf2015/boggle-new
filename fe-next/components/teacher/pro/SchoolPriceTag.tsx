'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { SCHOOL_PRICING, estimateSchoolAnnualUsd, schoolPriceLabel } from '@/lib/education/pro/schoolPricing';

export function SchoolPriceTag({ className }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <div data-testid="school-price" className={cn('font-neo-display font-black', className)}>
      <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
        <span className="text-sm font-bold opacity-80">{t('eg2Pro.school.priceFrom')}</span>
        <bdi dir="ltr" data-testid="school-price-amount" className="text-4xl">{schoolPriceLabel()}</bdi>
        <span className="text-sm font-bold opacity-80">{t('eg2Pro.school.pricePer')}</span>
      </p>
      <p data-testid="school-price-terms" className="mt-1.5 text-xs font-bold opacity-80">
        {t('eg2Pro.school.priceTerms', { min: SCHOOL_PRICING.minTeachers })}
      </p>
      <p data-testid="school-price-example" className="mt-1 text-xs font-bold opacity-80">
        {t('eg2Pro.school.estimate', {
          teachers: SCHOOL_PRICING.minTeachers,
          total: `⁦$${estimateSchoolAnnualUsd(SCHOOL_PRICING.minTeachers)}⁩`,
        })}
      </p>
    </div>
  );
}
