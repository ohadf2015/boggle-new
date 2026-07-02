'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TowerNoticeTone =
  | 'lime' | 'cyan' | 'yellow' | 'orange' | 'pink' | 'purple' | 'red' | 'cream' | 'quiet';

/** Tone → surface. Electric families for celebration beats, red for alarm,
 *  cream for scenic flybys, quiet for low-key anticipation chips. */
const TONE_CLASS: Record<TowerNoticeTone, string> = {
  lime: 'border-neo-thick bg-neo-lime text-black',
  cyan: 'border-neo-thick bg-neo-cyan text-black',
  yellow: 'border-neo-thick bg-neo-yellow text-black',
  orange: 'border-neo-thick bg-neo-orange text-black',
  pink: 'border-neo-thick bg-neo-pink text-neo-white',
  purple: 'border-neo-thick bg-neo-purple text-neo-white',
  red: 'border-neo-thick bg-neo-red text-neo-white',
  cream: 'border-neo-thick bg-neo-cream text-black',
  quiet: 'border-neo bg-neo-navy/80 text-neo-cyan backdrop-blur-sm',
};

interface Props {
  tone: TowerNoticeTone;
  /** Main line — already translated. */
  title: ReactNode;
  /** Small uppercase label above the title (e.g. "ENTERED"). */
  kicker?: ReactNode;
  /** Small sub-line below the title (e.g. "+3.5m"). */
  detail?: ReactNode;
  /** Run the shared exit keyframe (pairs with useExitReveal's `exiting`). */
  exiting?: boolean;
  reducedMotion?: boolean;
  /** Alarm beats (tower ruined) interrupt screen readers. */
  assertive?: boolean;
  /** Shake instead of pop on entry — alarm entrance. */
  shake?: boolean;
  className?: string;
  /** Override the title line's default uppercase display styling (twMerge'd). */
  titleClassName?: string;
}

/**
 * TowerNotice — the ONE transient-banner surface for Word Tower.
 *
 * Every celebration/alarm toast (zone, milestone, clutch, new-best, combo,
 * surprise, achievement, wreck report…) renders through this chip inside the
 * play screen's single notice column, so simultaneous beats STACK in a neat
 * flex column instead of overlapping at hand-tuned absolute offsets (the
 * "three toasts on top of each other" screenshot, 2026-07-02).
 */
export function TowerNotice({ tone, title, kicker, detail, exiting, reducedMotion, assertive, shake, className, titleClassName }: Props) {
  const fx = reducedMotion ? '' : exiting ? 'wt-toast-out' : shake ? 'animate-neo-shake' : 'animate-neo-pop';
  return (
    <div
      role="status"
      aria-live={assertive ? 'assertive' : 'polite'}
      className={cn(
        'pointer-events-none flex w-fit max-w-[min(92vw,26rem)] flex-col items-center rounded-neo border-black px-4 py-2 text-center shadow-hard',
        TONE_CLASS[tone],
        fx,
        className,
      )}
    >
      {kicker && (
        <div className="font-neo-body text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">{kicker}</div>
      )}
      <div className={cn('font-neo-display text-base font-black uppercase tracking-wide', titleClassName)}>{title}</div>
      {detail && <div className="font-neo-body text-xs font-bold opacity-80">{detail}</div>}
    </div>
  );
}
