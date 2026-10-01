'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { QUICK_LAUNCH_KEY, readQuickLaunchIntent, type QuickLaunchIntent } from '../dashboard/quickLaunchIntent';
import { HQ_MODES, hqModeFacts } from './hqModes';
import { HqLaunchStage } from './HqLaunchStage';

const noop = () => () => {};
// The raw string is the snapshot: strings compare by value, so the store stays stable.
const readRaw = () => {
  try {
    return sessionStorage.getItem(QUICK_LAUNCH_KEY);
  } catch {
    return null;
  }
};

/** The GO LIVE intent still in session storage (fresh only) — null on the server. */
export function useQuickLaunchIntent(): QuickLaunchIntent | null {
  const raw = useSyncExternalStore(noop, readRaw, () => null);
  return useMemo(() => (raw ? readQuickLaunchIntent() : null), [raw]);
}

/** The launch stage named after the GO LIVE intent — generic when there is none. */
export function QuickLaunchStage() {
  const { t } = useLanguage();
  const intent = useQuickLaunchIntent();
  const mode = intent?.mode ? HQ_MODES.find((m) => m.id === intent.mode) : undefined;
  if (!intent || !mode) return <HqLaunchStage />;
  return (
    <HqLaunchStage
      modeLabel={t(mode.labelKey, mode.labelFallback)}
      listTitle={intent.title}
      poster={hqModeFacts(mode.id).poster}
    />
  );
}

export default QuickLaunchStage;
