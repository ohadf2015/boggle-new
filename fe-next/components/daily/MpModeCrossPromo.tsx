'use client';

import React, { useEffect, useRef } from 'react';
import { m } from 'framer-motion';
import Link from 'next/link';
import { Users, RefreshCw, Search } from 'lucide-react';
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
    iconColor: 'text-neo-purple',
    titleKey: 'mpCrossPromo.wheelRushTitle',
    titleFallback: 'Word Wheel · Live',
  },
  {
    target: 'word_hunt_mp',
    mode: 'word-hunt',
    icon: Search,
    iconColor: 'text-neo-lime',
    titleKey: 'mpCrossPromo.wordHuntTitle',
    titleFallback: 'Word Hunt · Live',
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

      <div data-testid="mp-live-grid" className="grid grid-cols-2 gap-2">
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
                className="flex h-full flex-col items-center justify-center gap-2 p-3 rounded-neo border-2 border-neo-black bg-neo-navy-light shadow-hard-sm hover:bg-neo-navy active:translate-x-px active:translate-y-px transition-colors text-center"
              >
                <span className="flex items-center justify-center w-9 h-9 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
                  <Icon className={`w-5 h-5 ${mode.iconColor}`} />
                </span>
                <span className="font-neo-display font-black text-neo-white text-xs leading-tight">
                  {t(mode.titleKey, mode.titleFallback)}
                </span>
              </Link>
            </m.div>
          );
        })}
      </div>
    </div>
  );
};

export default MpModeCrossPromo;
