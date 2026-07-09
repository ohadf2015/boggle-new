'use client';

import React, { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import {
  getDailyFlowSession,
  nextFlowStep,
  flowProgress,
  isFlowComplete,
} from '@/utils/dailyChallenge/flow';
import { readPlayedMap } from './flowSteps';

interface FlowContinueBarProps {
  /** Only render while the player is inside a flow run (`?flow=1`). */
  active: boolean;
}

/**
 * Sticky "continue the flow" bar shown on a challenge's results while the player
 * is mid-flow. It's the hand-off back to the breather (DailyFlowController): the
 * player reads their result, then taps on to the next challenge — no detour to
 * the hub to re-arm a CTA. Self-gates to a live session so a stale `?flow=1`
 * link can't show a dead-end bar.
 */
export function FlowContinueBar({ active }: FlowContinueBarProps) {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const locale = language as Language;

  const [info, setInfo] = useState<{ done: number; total: number; last: boolean } | null>(null);

  useEffect(() => {
    if (!active) {
      setInfo(null);
      return;
    }
    const session = getDailyFlowSession();
    if (!session) {
      setInfo(null);
      return;
    }
    const played = readPlayedMap(session.steps, session.language);
    const { done, total } = flowProgress(session, played);
    // "last" = this completion clears the set; the bar then points at the finale.
    const last = isFlowComplete(session, played) || nextFlowStep(session, played) === null;
    setInfo({ done, total, last });
  }, [active]);

  if (!info) return null;

  return (
    <m.div
      data-testid="flow-continue-bar"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none"
    >
      <button
        type="button"
        onClick={() => router.push(`/${locale}/daily/flow`)}
        className={cn(
          'pointer-events-auto mx-auto w-full max-w-md flex items-center gap-3 px-5 py-3.5',
          'rounded-neo border-3 border-neo-black shadow-hard-lg',
          'bg-neo-lime text-neo-black font-neo-display font-black',
          'active:translate-y-px active:shadow-hard-pressed transition-all',
        )}
      >
        <span className="flex-1 text-start leading-tight">
          <span className="block text-base">
            {info.last
              ? t('daily.flow.barFinish', 'Finish the flow')
              : t('daily.flow.barNext', 'Next challenge')}
          </span>
          <span className="block text-[11px] font-bold text-neo-black/70">
            {t('daily.flow.progress', '{done} of {total} cleared', {
              done: info.done,
              total: info.total,
            })}
          </span>
        </span>
        <ArrowRight className={cn('w-5 h-5 shrink-0', isRTL && 'rotate-180')} strokeWidth={3} />
      </button>
    </m.div>
  );
}

export default FlowContinueBar;
