'use client';

import React, { Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import ConnectionsDailyChallenge from '@/components/connections/ConnectionsDailyChallenge';
import PyramidChallenge from '@/components/connections/pyramid/PyramidChallenge';
import { dailyConnectionsVariant } from '@/lib/connections/dailyVariant';
import { todayUTC } from '@/lib/connections/dailyClient';
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

/**
 * The Word Bridge daily quest — one route, two alternating flavors. By UTC day
 * the quest is either the classic 5-riddle chain (shared leaderboard) or the
 * 3-stage pyramid with its meta-answer finale. The variant is a pure function
 * of the date (lib/connections/dailyVariant.ts), so the hub card, this host
 * and every share link agree worldwide. Locales without a pyramid pool keep
 * the 5-riddle chain every day rather than rendering nothing.
 */
export default function DailyPageClient({ locale }: Props): React.JSX.Element {
  const variant = dailyConnectionsVariant(todayUTC());
  const hasPyramids = getPyramidsForLocale(locale).length > 0;
  const hostPyramid = variant === 'pyramid' && hasPyramids;

  return (
    <div data-testid="connections-daily-root" className="flex-1 flex flex-col min-h-0">
      <Suspense fallback={<LoadingFallback />}>
        {hostPyramid ? (
          <PyramidChallenge sharePath={`${locale}/connections/daily`} />
        ) : (
          <ConnectionsDailyChallenge />
        )}
      </Suspense>
    </div>
  );
}
