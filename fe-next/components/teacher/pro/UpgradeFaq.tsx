'use client';

import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { UPGRADE_FAQ_KEYS, upgradeFaqParams } from '@/lib/education/pro/upgradeFaq';

export { UPGRADE_FAQ_KEYS, upgradeFaqParams };

export function UpgradeFaq() {
  const { t } = useLanguage();
  const params = upgradeFaqParams();
  return (
    <section aria-labelledby="upgrade-faq-title" className="mt-6">
      <h2 id="upgrade-faq-title" className="mb-3 font-neo-display text-xl font-black text-neo-white lg:text-2xl">
        {t('teacher.subscription.faqTitle')}
      </h2>
      <div className="grid gap-2 lg:grid-cols-2 lg:items-start">
        {UPGRADE_FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light open:border-neo-cyan open:shadow-hard-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-black text-neo-white">{t(`eg2Pro.faq.${key}Q`, params)}</h3>
              <ChevronDown
                data-testid="faq-chevron"
                aria-hidden
                className="h-4 w-4 shrink-0 text-neo-lime transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="px-3 pb-3 text-sm font-bold leading-relaxed text-neo-white/85">{t(`eg2Pro.faq.${key}A`, params)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
