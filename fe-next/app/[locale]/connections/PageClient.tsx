'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePostHogFlag } from '@/hooks/usePostHogFlag';
import { PageLoader } from '@/components/ui/PageLoader';
import ConnectionsGame from '@/components/connections/ConnectionsGame';

function LoadingFallback(): React.JSX.Element {
  const { t } = useLanguage();
  return (
    <div className="flex-1 flex items-center justify-center">
      <PageLoader size="lg" text={t('connections.loading')} />
    </div>
  );
}

function ConnectionsGated(): React.JSX.Element {
  const { t } = useLanguage();
  const enabled = usePostHogFlag<boolean>('connections_game', false);

  if (!enabled) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-neo-white/50 font-neo-body text-center px-4">{t('connections.noAccess')}</p>
      </div>
    );
  }

  return <ConnectionsGame />;
}

export default function ConnectionsPageClient(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        <ConnectionsGated />
      </Suspense>
    </div>
  );
}
