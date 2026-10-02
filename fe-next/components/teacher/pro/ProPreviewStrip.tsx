'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ProFeaturePreview } from './ProFeaturePreview';
import type { ProFeature } from '@/components/teacher/ProGate';

const STRIP: ProFeature[] = ['analytics', 'mastery', 'missedPractice'];

export function ProPreviewStrip() {
  const { t } = useLanguage();
  return (
    <section data-testid="pro-preview-strip" aria-labelledby="pro-strip-title" className="mt-8">
      <h2 id="pro-strip-title" className="font-neo-display text-xl font-black text-neo-white lg:text-2xl">
        {t('eg2Pro.strip.title')}
      </h2>
      <p className="mb-3 text-sm font-bold text-neo-white/70">{t('eg2Pro.strip.lead')}</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STRIP.map((feature) => (
          <div key={feature} aria-hidden="true">
            <ProFeaturePreview feature={feature} />
          </div>
        ))}
      </div>
    </section>
  );
}
