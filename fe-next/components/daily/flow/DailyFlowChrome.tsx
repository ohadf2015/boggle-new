'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { DAILY_MODES, dailyModeHref, type DailyModeId } from '@/lib/dailyModes';
import { cn } from '@/lib/utils';

interface DailyFlowChromeProps {
  modeId: DailyModeId;
  /** Show the opening animation (word wheel has its own ready card, so it opts out). */
  intro?: boolean;
  /** Show the floating "back to daily" pill (modes with their own back control opt out). */
  backLink?: boolean;
  /** Render the nav in normal flow (above the game) instead of floating over it. */
  inline?: boolean;
}

const INTRO_MS = 1600;
const introKey = (id: DailyModeId) => `lc:daily-intro:${id}:${new Date().toISOString().slice(0, 10)}`;

/**
 * Shared chrome for every daily challenge page:
 *  - an opening animation in the Word Wheel ready-card style (step N of 4,
 *    mode art + title springing in, letter tiles orbiting), auto-dismissed and
 *    tap-to-skip, shown once per mode per day;
 *  - an always-available "back to daily" pill, plus "skip" for optional modes,
 *    so the player can return to the daily hub from any challenge.
 */
export function DailyFlowChrome({ modeId, intro = true, backLink = true, inline = false }: DailyFlowChromeProps) {
  const { t, language } = useLanguage();
  const index = DAILY_MODES.findIndex((md) => md.id === modeId);
  const mode = DAILY_MODES[index];
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    if (!intro || !mode) return;
    let seen = false;
    try { seen = sessionStorage.getItem(introKey(modeId)) === '1'; } catch { /* storage off */ }
    if (seen) return;
    setShowIntro(true);
    try { sessionStorage.setItem(introKey(modeId), '1'); } catch { /* storage off */ }
    const timer = setTimeout(() => setShowIntro(false), INTRO_MS);
    return () => clearTimeout(timer);
  }, [intro, mode, modeId]);

  if (!mode) return null;
  const hubHref = `/${language}/daily`;
  // Skip = move on along the chain; only the last quest skips back to the hub.
  const nextMode = DAILY_MODES[index + 1];
  const skipHref = nextMode ? dailyModeHref(nextMode, language) : hubHref;

  return (
    <>
      {backLink && (
        <div className={cn(inline ? 'relative z-10 flex w-full gap-1.5 px-3 pt-2 pb-1' : 'fixed top-[max(env(safe-area-inset-top),0.5rem)] start-2 z-40 flex gap-1.5')} data-testid="daily-flow-nav" data-inline={inline ? 'true' : 'false'}>
          <Link
            href={hubHref}
            data-testid="back-to-daily"
            className="flex items-center gap-1 h-9 px-3 rounded-full border-2 border-neo-black bg-neo-navy/90 text-neo-white text-xs font-black shadow-hard-sm backdrop-blur"
          >
            <span aria-hidden className="ltr:rotate-180 inline-block">›</span>
            {t('daily.backToDailyHub')}
          </Link>
          {mode.optional && (
            <Link
              href={skipHref}
              data-testid="skip-optional"
              className="flex items-center gap-1 h-9 px-3 rounded-full border-2 border-neo-black bg-white/10 text-neo-cream text-xs font-black backdrop-blur"
            >
              <span aria-hidden className="rtl:rotate-180 inline-block">⏭</span>
              {t('daily.skipOptional')}
            </Link>
          )}
        </div>
      )}

      <AnimatePresence>
        {showIntro && (
          <m.button
            type="button"
            key="intro"
            data-testid="daily-intro"
            onClick={() => setShowIntro(false)}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-neo-navy/95 backdrop-blur-sm"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.28 }}
            aria-label={t(mode.titleKey)}
          >
            <m.span
              className="text-[11px] font-black uppercase tracking-[0.2em] text-neo-lime/80"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {t('daily.journeyStep')} {index + 1}/{DAILY_MODES.length}
              {mode.optional ? ` · ${t('daily.journeyOptional')}` : ''}
            </m.span>
            <div className="relative w-52 h-52 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-neo-lime/25 shadow-[0_0_36px_rgba(191,255,0,0.18)]" />
              {Array.from({ length: 6 }, (_, i) => {
                const rad = (i * 60 * Math.PI) / 180;
                const x = Math.sin(rad) * 78;
                const y = -Math.cos(rad) * 78;
                return (
                  <m.span
                    key={i}
                    aria-hidden
                    className={cn('absolute inset-0 m-auto w-10 h-10 rounded-full border-3 border-neo-black shadow-[2px_2px_0_black]', i % 2 ? 'bg-neo-cream' : 'bg-neo-lime')}
                    initial={{ scale: 0, x: 0, y: 0 }}
                    animate={{ scale: 1, x, y }}
                    transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 400, damping: 18 }}
                  />
                );
              })}
              <m.div
                className="w-28 h-28 rounded-full border-3 border-neo-black overflow-hidden shadow-[4px_4px_0_black,0_0_24px_rgba(191,255,0,0.45)]"
                initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 16 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- intro art */}
                <img src={mode.art} alt="" className="w-full h-full object-cover" draggable={false} />
              </m.div>
            </div>
            <m.h1
              className="font-neo-display font-black text-4xl text-neo-white"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 18 }}
            >
              {t(mode.titleKey)}
            </m.h1>
          </m.button>
        )}
      </AnimatePresence>
    </>
  );
}

export default DailyFlowChrome;
