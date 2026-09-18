'use client';

import { useEffect } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { WordTowerGame } from '@/components/wordTower/WordTowerGame';
import { ModeCoach } from '@/components/tutorial/ModeCoach';

/**
 * Word Tower is PUBLIC — the route no longer gates anyone.
 *
 * It used to redirect non-admins home unless the `word-tower` PostHog flag was
 * on. That flag is a MULTIVARIATE experiment ('on'/'off' 50/50), and
 * `usePostHogFlag<boolean>` hands back the variant STRING — so the gate read
 * `"off"` as truthy and let everyone through anyway. A gate that only pretends
 * to gate is worse than none: it made the mode look shipped while the real
 * blocker (the daily hub only drew the card for admins) went unnoticed. Deleted
 * rather than repaired — the mode is meant to be live. `trackExposure` stays for
 * usage analytics.
 */
export function WordTowerPageClient() {
  const { trackExposure } = useExperiment('word-tower');

  useEffect(() => { trackExposure(); }, [trackExposure]);

  return (
    <>
      <ModeCoach mode="wordTower" />
      <WordTowerGame />
    </>
  );
}
