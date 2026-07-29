'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import ConnectionsGame from '@/components/connections/ConnectionsGame';

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

export default function PlayPageClient(_props: Props): React.JSX.Element {
  return (
    <div data-testid="connections-play-root" className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        <ConnectionsGame />
      </Suspense>
    </div>
  );
}
