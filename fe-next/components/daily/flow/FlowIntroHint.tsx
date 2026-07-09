'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/storageHelpers';

const INTRO_SEEN_KEY = 'lexiclash_daily_flow_intro_seen';

/**
 * One-time caption explaining what the Daily Flow start control actually does
 * — a first-time visitor sees only "Play all challenges" + a hold gesture with
 * no context for what "flow" means. Marked seen the moment it's shown (not on
 * dismiss, there's no dismiss action) so a reload never re-pops it once shown.
 */
export function FlowIntroHint() {
  const { t } = useLanguage();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getFromLocalStorage(INTRO_SEEN_KEY)) return;
    saveToLocalStorage(INTRO_SEEN_KEY, '1');
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <p className="flex items-start gap-2 text-xs text-neo-white/70 px-1">
      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
      {t(
        'daily.flow.introHint',
        "Daily Flow chains today's challenges into one tap-through run — hold the button to skip the breathers.",
      )}
    </p>
  );
}

export default FlowIntroHint;
