'use client';

/** DEV-ONLY `?preview=warmup`: the waiting-room spelling warm-up with a sample list in the page language. */

import { useLanguage } from '@/contexts/LanguageContext';
import { WaitingWarmUp } from '@/components/education/lobby/WaitingWarmUp';

export const WARM_UP_SAMPLE: Record<string, string[]> = {
  en: ['river', 'planet', 'cloud'],
  he: ['שלום', 'חלון', 'ספר'],
  es: ['gato', 'árbol', 'nube'],
  ja: ['さくら', 'ねこ', 'そら'],
  ru: ['река', 'облако', 'кошка'],
  sv: ['katt', 'moln', 'båt'],
};

export function WarmUpPreview() {
  const { t, language } = useLanguage();
  return (
    <div dir={language === 'he' ? 'rtl' : 'ltr'} className="fixed inset-0 z-[80] flex items-center justify-center bg-neo-navy px-4">
      <WaitingWarmUp username="Maya" words={WARM_UP_SAMPLE[language] ?? WARM_UP_SAMPLE.en} t={t} />
    </div>
  );
}

export default WarmUpPreview;
