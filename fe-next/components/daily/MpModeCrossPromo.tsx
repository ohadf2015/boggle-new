'use client';

import React, { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Users, ArrowRight, RefreshCw, Search } from 'lucide-react';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { Language } from '@/types';

interface MpModeCrossPromoProps {
  /** Player locale — drives the /{language}/multiplayer route prefix. */
  language: Language;
  /** Origin screen for analytics, e.g. 'word_wheel_results' | 'word_hunt_results'. */
  source: string;
  t: (key: string, fallback?: string) => string;
}

/**
 * Multiplayer cross-promotion shown on Daily Challenge results.
 *
 * Nudges players who just finished a daily into the LIVE versions of the same
 * mechanics — Wheel Rush (Word Wheel MP) and Word Hunt MP — to convert solo
 * daily players into multiplayer sessions. Click-through is measured against an
 * on-mount impression so PostHog can compute CTR per target.
 *
 * Deliberately rendered AFTER the daily↔daily cross-promo so it never competes
 * with finishing today's daily pair.
 */
const MP_MODES = [
  {
    target: 'wheel_rush_mp',
    mode: 'wheel-rush',
    icon: RefreshCw,
    accent: 'bg-neo-purple',
    titleKey: 'mpCrossPromo.wheelRushTitle',
    titleFallback: 'Word Wheel · Live',
    descKey: 'mpCrossPromo.wheelRushDesc',
    descFallback: 'Race rivals on the wheel in real time',
  },
  {
    target: 'word_hunt_mp',
    mode: 'word-hunt',
    icon: Search,
    accent: 'bg-neo-lime',
    titleKey: 'mpCrossPromo.wordHuntTitle',
    titleFallback: 'Word Hunt · Live',
    descKey: 'mpCrossPromo.wordHuntDesc',
    descFallback: 'Hunt the hidden words against others',
  },
] as const;

const MpModeCrossPromo: React.FC<MpModeCrossPromoProps> = ({ language, source, t }) => {
  // Impression once per mount (StrictMode double-invoke guard).
  const impressedRef = useRef(false);
  useEffect(() => {
    if (impressedRef.current) return;
    impressedRef.current = true;
    for (const m of MP_MODES) {
      trackGrowthEvent('cross_promo_impression', { target: m.target, source, language });
    }
  }, [source, language]);

  return (
    <div className="w-full z-10 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 px-1">
        <Users className="w-4 h-4 text-neo-cyan" />
        <span className="text-neo-white text-xs font-neo-display font-black uppercase tracking-wider">
          {t('mpCrossPromo.heading', 'Play live with others')}
        </span>
      </div>

      {MP_MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <m.div
            key={mode.target}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <Link
              href={`/${language}/multiplayer?mode=${mode.mode}`}
              onClick={() => trackGrowthEvent('cross_promo_click', {
                target: mode.target,
                source,
                placement: 'mp_cross_promo',
                language,
              })}
              className={`flex items-center justify-between gap-3 w-full p-4 rounded-neo border-3 border-neo-black ${mode.accent} shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
                  <Icon className="w-6 h-6 text-neo-white" />
                </div>
                <div>
                  <span className="block font-neo-display font-black text-neo-black text-base leading-tight">
                    {t(mode.titleKey, mode.titleFallback)}
                  </span>
                  <p className="text-neo-black/70 text-xs mt-0.5">
                    {t(mode.descKey, mode.descFallback)}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-neo-black shrink-0" />
            </Link>
          </m.div>
        );
      })}
    </div>
  );
};

export default MpModeCrossPromo;
