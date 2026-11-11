'use client';

import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import type { RecordUnit } from '@/lib/records/recordKeys';

export function useRecordFormatter(): (value: number, unit: RecordUnit) => string {
  const { t, language } = useLanguage();
  return useCallback(
    (value: number, unit: RecordUnit) => {
      const n = safeToLocaleString(Math.floor(value), language);
      return unit === 'metres' ? t('worldRecords.metres', { value: n }) : n;
    },
    [t, language],
  );
}
