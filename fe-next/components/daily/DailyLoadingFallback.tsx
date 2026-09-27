'use client';

import React from 'react';
import { PageLoader } from '@/components/ui/PageLoader';
import { useLanguage } from '@/contexts/LanguageContext';

interface DailyLoadingFallbackProps {
  mode: 'wordHunt' | 'wordWheel';
}

export function DailyLoadingFallback({ mode }: DailyLoadingFallbackProps): React.JSX.Element {
  const { t } = useLanguage();
  const text = mode === 'wordHunt' ? t('daily.loadingWordHunt') : t('daily.loadingWordWheel');

  return (
    <div className="flex-1 flex items-center justify-center bg-neo-navy">
      <PageLoader size="lg" text={text} />
    </div>
  );
}

export default DailyLoadingFallback;
