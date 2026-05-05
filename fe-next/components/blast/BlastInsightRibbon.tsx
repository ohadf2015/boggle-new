'use client';

/**
 * BlastInsightRibbon — single-headline "moment of the run" card on the
 * after-wave results screen. Tabloid-style: tilted, hard-shadowed, color-
 * coded by tone. Stops the flat "score+stats" pattern from feeling generic.
 *
 * Animation: GSAP slam-in from top + shake settle. Reduced-motion users
 * get a fade-only via prefers-reduced-motion check inside the timeline.
 *
 * RTL-aware: rotation direction flips for Hebrew so the lean reads as a
 * sticker placed by a LTR/RTL hand respectively.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { pickBlastInsight, type BlastInsightTone } from './utils/blastInsightPicker';
import type { BlastResultsData } from './types';

interface BlastInsightRibbonProps {
  results: BlastResultsData;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Match document direction for tilt direction; default 'ltr'. */
  dir?: 'ltr' | 'rtl';
}

const TONE_CLASS: Record<BlastInsightTone, string> = {
  lime: 'bg-neo-lime text-neo-black',
  pink: 'bg-neo-pink text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
};

export function BlastInsightRibbon({ results, t, dir = 'ltr' }: BlastInsightRibbonProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const insight = pickBlastInsight(results);

  useEffect(() => {
    const el = ribbonRef.current;
    if (!el) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' });
      return;
    }

    // Slam-in from offscreen-top, slight overshoot, settle with a quick wobble.
    const tl = gsap.timeline();
    tl.fromTo(el,
      { y: -80, opacity: 0, rotate: dir === 'rtl' ? -8 : 8, scale: 0.85 },
      { y: 0, opacity: 1, rotate: dir === 'rtl' ? 1 : -1, scale: 1, duration: 0.55, ease: 'back.out(1.7)' },
    );
    // Tiny secondary shake — feels like the sticker hit the wall.
    tl.to(el, { x: 4, duration: 0.06, ease: 'power2.out' }, '-=0.08');
    tl.to(el, { x: -3, duration: 0.06, ease: 'power2.out' });
    tl.to(el, { x: 0, duration: 0.08, ease: 'power2.out' });

    return () => { tl.kill(); };
  }, [insight.id, dir]);

  // Localized headline — picker returns key + vars; t() does substitution.
  const headline = t(insight.key, insight.vars);

  return (
    <div
      ref={ribbonRef}
      data-testid="blast-insight-ribbon"
      data-insight-id={insight.id}
      data-insight-tone={insight.tone}
      className={cn(
        'w-full px-4 py-3 my-1',
        'rounded-neo border-3 border-neo-black shadow-hard-lg',
        'font-neo-display font-black uppercase tracking-wider',
        'text-center text-sm leading-tight',
        TONE_CLASS[insight.tone],
      )}
    >
      <div className="text-[9px] tracking-[0.2em] opacity-70 mb-0.5">
        {t('blast.insight.label')}
      </div>
      <div className="text-base">
        {headline}
      </div>
    </div>
  );
}
