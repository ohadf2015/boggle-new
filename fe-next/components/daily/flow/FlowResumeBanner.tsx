'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Play, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import {
  getDailyFlowSession,
  nextFlowStep,
  flowProgress,
} from '@/utils/dailyChallenge/flow';
import { flowStepMeta, readPlayedMap } from './flowSteps';

/**
 * Hub banner that surfaces an in-progress Daily Flow so a player who stepped
 * away mid-run gets a one-tap way back to exactly where they left off — instead
 * of hunting for the next mode's card. Renders nothing when there's no live flow
 * or it's already finished.
 */
export function FlowResumeBanner() {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const locale = language as Language;

  // Resolve after mount only — the session lives in localStorage, so reading it
  // during render would risk a hydration mismatch.
  const [state, setState] = useState<{
    nextTitleKey: string;
    done: number;
    total: number;
    fast: boolean;
  } | null>(null);

  useEffect(() => {
    const session = getDailyFlowSession();
    if (!session) {
      setState(null);
      return;
    }
    const played = readPlayedMap(session.steps, session.language);
    const step = nextFlowStep(session, played);
    if (!step) {
      setState(null);
      return;
    }
    const { done, total } = flowProgress(session, played);
    const meta = flowStepMeta(step);
    setState({ nextTitleKey: meta?.titleKey ?? '', done, total, fast: session.fast });
  }, [language]);

  if (!state) return null;

  return (
    <m.button
      type="button"
      data-testid="flow-resume-banner"
      onClick={() => router.push(`/${locale}/daily/flow`)}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black shadow-hard-lg',
        'bg-gradient-to-r from-neo-purple to-neo-pink text-neo-white',
        'active:translate-y-px active:shadow-hard-pressed transition-all',
      )}
    >
      <span className="w-10 h-10 rounded-full border-2 border-neo-black bg-neo-white flex items-center justify-center shrink-0 shadow-hard-xs">
        {state.fast ? (
          <Zap className="w-5 h-5 text-neo-black" strokeWidth={2.5} />
        ) : (
          <Play className="w-5 h-5 text-neo-black" strokeWidth={2.5} />
        )}
      </span>
      <span className="flex-1 min-w-0 text-start">
        <span className="block font-neo-display font-black text-sm leading-tight">
          {t('daily.flow.resumeTitle', 'Resume your flow')}
        </span>
        <span className="block text-xs text-neo-white/85">
          {t('daily.flow.resumeSubtitle', '{done}/{total} done · next: {mode}', {
            done: state.done,
            total: state.total,
            mode: state.nextTitleKey ? t(state.nextTitleKey) : '',
          })}
        </span>
      </span>
      <span
        className={cn(
          'shrink-0 px-3 py-1.5 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-xs shadow-hard-sm',
          isRTL ? 'rotate-0' : '',
        )}
      >
        {t('daily.flow.resumeCta', 'Resume')}
      </span>
    </m.button>
  );
}

export default FlowResumeBanner;
