'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import PyramidChallenge from '@/components/connections/pyramid/PyramidChallenge';
import ConnectionsGame from '@/components/connections/ConnectionsGame';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';

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

export default function PyramidPageClient({ locale }: Props): React.JSX.Element {
  // Pyramid is the flagship mode, so app-internal links point here for every
  // locale — locales without a pyramid pool fall back to the classic chain
  // instead of a blank screen.
  const hasPyramids = getPyramidsForLocale(locale).length > 0;
  return (
    <div data-testid="connections-pyramid-root" className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        {hasPyramids ? <PyramidChallenge /> : <ConnectionsGame />}
      </Suspense>
    </div>
  );
}
