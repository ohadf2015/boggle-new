'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import PyramidChallenge from '@/components/connections/pyramid/PyramidChallenge';

interface Props {
  locale: string;
}

function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex items-center justify-center">
      <PageLoader size="lg" text={t('connections.loading')} />
    </div>
  );
}

export default function PyramidPageClient(_props: Props): React.JSX.Element {
  return (
    <div data-testid="connections-pyramid-root" className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        <PyramidChallenge />
      </Suspense>
    </div>
  );
}
