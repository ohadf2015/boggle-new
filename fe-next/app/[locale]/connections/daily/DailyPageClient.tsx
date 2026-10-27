'use client';

import React, { Suspense, useCallback, useLayoutEffect, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import ConnectionsDailyChallenge from '@/components/connections/ConnectionsDailyChallenge';
import PyramidChallenge from '@/components/connections/pyramid/PyramidChallenge';
import { dailyConnectionsVariant } from '@/lib/connections/dailyVariant';
import { todayUTC } from '@/lib/connections/dailyClient';
import { getPyramidsForLocale } from '@/lib/connections/pyramid/puzzles';
import { DailyFlowChrome } from '@/components/daily/flow/DailyFlowChrome';
import BridgeTutorial from '@/components/connections/tutorial/BridgeTutorial';
import { shouldAutoShowTutorial, markTutorialSeen } from '@/components/connections/tutorial/tutorialGate';

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
type TutorialState = 'undecided' | 'auto' | 'manual' | 'off';

export default function DailyPageClient({ locale }: Props): React.JSX.Element {
  const { t } = useLanguage();
  const today = todayUTC();
  const variant = dailyConnectionsVariant(today);
  const hasPyramids = getPyramidsForLocale(locale).length > 0;
  const hostPyramid = variant === 'pyramid' && hasPyramids;
  const [finished, setFinished] = useState(false);
  const handleTerminal = useCallback(() => setFinished(true), []);
  const [tutorial, setTutorial] = useState<TutorialState>('undecided');
  const closeTutorial = useCallback(() => setTutorial('off'), []);

  // Decided before paint, so a first-timer never sees the game flash first.
  useLayoutEffect(() => {
    if (shouldAutoShowTutorial(today, locale)) {
      markTutorialSeen();
      setTutorial('auto');
    } else {
      setTutorial('off');
    }
    // Once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tutorialOpen = tutorial === 'auto' || tutorial === 'manual';
  // An auto-shown lesson comes before the run starts; one opened mid-run keeps the run mounted underneath.
  const gameMounted = tutorial === 'manual' || tutorial === 'off';

  return (
    <div data-testid="connections-daily-root" className="flex-1 flex flex-col min-h-0">
      <div className="relative">
        <DailyFlowChrome modeId="connections" inline skip={!finished && !tutorialOpen} />
        {tutorial === 'off' && !finished && (
          <button
            type="button"
            data-testid="connections-how-to-play"
            onClick={() => setTutorial('manual')}
            className="absolute end-3 top-2 z-10 flex h-9 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-navy/90 px-3 text-xs font-black text-neo-white shadow-hard-sm"
          >
            <CircleHelp className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
            {t('daily.howToPlay')}
          </button>
        )}
      </div>
      {tutorialOpen && <BridgeTutorial onDone={closeTutorial} />}
      {gameMounted && (
        <div className={tutorialOpen ? 'hidden' : 'flex-1 flex flex-col min-h-0'}>
          <Suspense fallback={<LoadingFallback />}>
            {hostPyramid ? (
              <PyramidChallenge sharePath={`${locale}/connections/daily`} onTerminal={handleTerminal} />
            ) : (
              <ConnectionsDailyChallenge onTerminal={handleTerminal} />
            )}
          </Suspense>
        </div>
      )}
    </div>
  );
}
