'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Search, CircleDot, Building2, Check, Pause, ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Language } from '@/types';
import type { DailyModeId } from '@/lib/dailyModes';
import {
  getDailyFlowSession,
  pauseDailyFlow,
  resumeDailyFlow,
  completeDailyFlow,
  clearDailyFlow,
  nextFlowStep,
  flowProgress,
  type DailyFlowSession,
} from '@/utils/dailyChallenge/flow';
import { flowStepHref, flowStepMeta, readPlayedMap } from './flowSteps';

const STEP_ICON: Record<DailyModeId, React.ReactNode> = {
  'word-hunt': <Search className="w-8 h-8 text-neo-black" strokeWidth={2.5} />,
  'word-wheel': <CircleDot className="w-8 h-8 text-neo-black" strokeWidth={2.5} />,
  'word-tower': <Building2 className="w-8 h-8 text-neo-black" strokeWidth={2.5} />,
};

// Seconds the fast flow lingers on the breather before rolling on. Long enough
// to register "next up: X", short enough to feel like one continuous run.
const FAST_AUTO_SECONDS = 3;

type View =
  | { kind: 'loading' }
  | { kind: 'empty' } // no session — bounce to hub
  | { kind: 'break'; session: DailyFlowSession; step: DailyModeId; done: number; total: number }
  | { kind: 'complete'; total: number };

/**
 * The connective tissue of the Daily Flow: the breather screen shown between
 * challenges. It reads the persisted flow session, figures out the next unplayed
 * mode from real completion status, and either rolls the player onward (fast
 * flow auto-advances; relaxed flow waits for a tap) or celebrates the finish.
 *
 * Every challenge route, when launched in-flow (`?flow=1`), returns here on
 * completion — so this one component owns all the "what's next" logic and the
 * per-round pause/resume, and the games stay ignorant of the flow beyond a
 * single "route back here when done" hook.
 */
export default function DailyFlowController() {
  const { t, language, dir } = useLanguage();
  const router = useRouter();
  const isRTL = dir === 'rtl';
  const locale = language as Language;

  const [view, setView] = useState<View>({ kind: 'loading' });
  const [autoLeft, setAutoLeft] = useState<number>(FAST_AUTO_SECONDS);
  const [autoArmed, setAutoArmed] = useState<boolean>(false);

  // Resolve the current step from persisted session + real played status. Run on
  // mount and whenever we return to the tab (a challenge finished in another view).
  const resolve = useCallback(() => {
    const session = getDailyFlowSession();
    if (!session) {
      setView({ kind: 'empty' });
      return;
    }
    const played = readPlayedMap(session.steps, session.language);
    const step = nextFlowStep(session, played);
    const { done, total } = flowProgress(session, played);
    if (!step) {
      completeDailyFlow();
      setView({ kind: 'complete', total });
      return;
    }
    setView({ kind: 'break', session, step, done, total });
    setAutoArmed(session.fast && done > 0); // don't auto-fire the very first breather
    setAutoLeft(FAST_AUTO_SECONDS);
  }, []);

  useEffect(() => {
    resolve();
    const onVis = () => {
      if (document.visibilityState === 'visible') resolve();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [resolve]);

  // Empty session → nothing to run; send the player back to the hub.
  useEffect(() => {
    if (view.kind === 'empty') router.replace(`/${locale}/daily`);
  }, [view.kind, router, locale]);

  const goToStep = useCallback(
    (step: DailyModeId) => {
      resumeDailyFlow();
      router.push(flowStepHref(step, locale));
    },
    [router, locale],
  );

  const handleContinue = useCallback(() => {
    if (view.kind === 'break') goToStep(view.step);
  }, [view, goToStep]);

  const handlePause = useCallback(() => {
    setAutoArmed(false);
    pauseDailyFlow();
    router.push(`/${locale}/daily`);
  }, [router, locale]);

  const handleFinish = useCallback(() => {
    clearDailyFlow();
    router.push(`/${locale}/daily`);
  }, [router, locale]);

  // Fast-flow auto-advance countdown for between-round breathers.
  useEffect(() => {
    if (view.kind !== 'break' || !autoArmed) return;
    if (autoLeft <= 0) {
      goToStep(view.step);
      return;
    }
    const id = setTimeout(() => setAutoLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [view, autoArmed, autoLeft, goToStep]);

  const meta = useMemo(
    () => (view.kind === 'break' ? flowStepMeta(view.step) : null),
    [view],
  );

  if (view.kind === 'loading' || view.kind === 'empty') {
    return <div className="flex-1 bg-neo-navy" aria-hidden />;
  }

  if (view.kind === 'complete') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neo-navy px-4 pb-bottom-stack">
        <m.div
          className="w-full max-w-md flex flex-col items-center text-center gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        >
          <m.div
            className="w-24 h-24 rounded-full border-3 border-neo-black bg-neo-lime flex items-center justify-center shadow-hard-lg"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
          >
            <Trophy className="w-12 h-12 text-neo-black" strokeWidth={2.5} />
          </m.div>
          <h1 className="font-neo-display font-black text-3xl text-neo-white">
            {t('daily.flow.doneTitle', 'Flow complete!')}
          </h1>
          <p className="text-neo-white/80 text-sm max-w-xs">
            {t('daily.flow.doneSubtitle', "You cleared every daily challenge. Come back tomorrow for a fresh run.")}
          </p>
          <button
            type="button"
            onClick={handleFinish}
            className="mt-1 px-6 py-3 rounded-neo border-3 border-neo-black bg-neo-cyan text-neo-black font-neo-display font-black shadow-hard-lg active:translate-y-px active:shadow-hard-pressed transition-all"
          >
            {t('daily.flow.doneCta', 'Back to Daily Hub')}
          </button>
        </m.div>
      </div>
    );
  }

  // view.kind === 'break'
  const { step, done, total } = view;
  const isFirst = done === 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-neo-navy px-4 pt-6 pb-bottom-stack sm:pb-6">
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          className="w-full max-w-md flex flex-col gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          {/* Progress dots */}
          <div className="flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-neo-lime font-neo-display font-black text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" aria-hidden />
              {t('daily.flow.title', 'Daily Flow')}
            </span>
            <div className="flex items-center gap-2" aria-label={`${done}/${total}`}>
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded-full border-2 border-neo-black transition-colors',
                    i < done ? 'bg-neo-lime' : 'bg-neo-navy-light',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Breather headline */}
          <div className="text-center">
            <h1 className="font-neo-display font-black text-2xl sm:text-3xl text-neo-white leading-tight">
              {isFirst
                ? t('daily.flow.readyTitle', "Let's go!")
                : t('daily.flow.nextTitle', 'Nice — keep the flow going')}
            </h1>
            {!isFirst && (
              <p className="text-neo-white/70 text-sm mt-1">
                {t('daily.flow.progress', '{done} of {total} cleared', { done, total })}
              </p>
            )}
          </div>

          {/* Next mode card */}
          <div
            className={cn(
              'relative flex items-center gap-4 p-4 rounded-neo border-3 border-neo-black shadow-hard-lg bg-neo-navy-light overflow-hidden',
            )}
          >
            <span className="absolute top-2 end-3 text-[10px] font-black uppercase tracking-wider text-neo-white/50">
              {t('daily.flow.nextUp', 'Next up')}
            </span>
            {meta?.mascot ? (
              <span className="relative w-14 h-14 rounded-full border-3 border-neo-black overflow-hidden shrink-0 shadow-hard">
                <Image src={meta.mascot} alt="" fill sizes="56px" className="object-cover" />
              </span>
            ) : (
              <span
                className={cn(
                  'w-14 h-14 rounded-full border-3 border-neo-black flex items-center justify-center shrink-0 shadow-hard',
                  meta?.chrome.accentBg ?? 'bg-neo-white',
                )}
              >
                {STEP_ICON[step]}
              </span>
            )}
            <div className="flex-1 min-w-0 pt-2">
              <h2 className="font-neo-display font-black text-lg text-neo-white truncate">
                {meta ? t(meta.titleKey) : step}
              </h2>
              {meta && (
                <p className="text-xs text-neo-white/70 line-clamp-2">{t(meta.descKey)}</p>
              )}
            </div>
          </div>

          {/* Continue */}
          <button
            type="button"
            onClick={handleContinue}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-5 py-4 rounded-neo border-3 border-neo-black',
              'bg-neo-lime text-neo-black font-neo-display font-black text-lg shadow-hard-lg',
              'active:translate-y-px active:shadow-hard-pressed transition-all',
            )}
          >
            {isFirst
              ? t('daily.flow.startCta', 'Start')
              : t('daily.flow.continueCta', 'Continue')}
            <ArrowRight className={cn('w-5 h-5', isRTL && 'rotate-180')} strokeWidth={3} />
          </button>

          {/* Fast-flow auto-advance hint + pause */}
          {autoArmed ? (
            <button
              type="button"
              onClick={() => setAutoArmed(false)}
              className="mx-auto inline-flex items-center gap-2 text-neo-white/70 text-xs font-bold"
            >
              <Pause className="w-3.5 h-3.5" aria-hidden />
              {t('daily.flow.autoAdvance', 'Auto-continuing in {n}s — tap to hold', { n: autoLeft })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="mx-auto inline-flex items-center gap-2 text-neo-white/60 hover:text-neo-white/90 text-xs font-bold transition-colors"
            >
              <Pause className="w-3.5 h-3.5" aria-hidden />
              {t('daily.flow.takeBreak', 'Take a break — resume anytime')}
            </button>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  );
}
