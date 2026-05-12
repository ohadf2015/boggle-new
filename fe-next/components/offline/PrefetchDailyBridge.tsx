'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefetchDailyContent } from '@/hooks/usePrefetchDailyContent';

export function PrefetchDailyBridge(): null {
  const { language } = useLanguage();
  usePrefetchDailyContent({ language });
  return null;
}
