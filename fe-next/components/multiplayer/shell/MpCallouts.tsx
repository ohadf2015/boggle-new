'use client';

import { memo, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** Callout lane: newest wins, shown for 780ms. */
export const CALLOUT_MS = 780;
/** Banner lane: a queue; only the head shows, for 1450ms each. */
export const BANNER_MS = 1450;

export interface MpCallout {
  id: string;
  text: string;
  /** `loud` for good news (≥ the score in size), `quiet` for failures. */
  tone?: 'loud' | 'quiet';
  color?: 'lime' | 'pink' | 'cyan' | 'purple';
}

export interface MpBanner {
  id: string;
  text: string;
  color?: 'lime' | 'pink' | 'cyan' | 'purple';
}

export interface MpCalloutsProps {
  callout: MpCallout | null;
  banners: MpBanner[];
  /** Called when the head banner has shown for BANNER_MS — drop it from your queue. */
  onBannerDone(): void;
}

const COLOR: Record<NonNullable<MpCallout['color']>, string> = {
  lime: 'text-neo-lime',
  pink: 'text-neo-pink',
  cyan: 'text-neo-cyan',
  purple: 'text-neo-purple',
};

/**
 * The WT2 two-lane rule, never a stack: one callout (newest wins) and one
 * banner (queue head). Non-interactive overlay; children animate transform only.
 */
function MpCalloutsImpl({ callout, banners, onBannerDone }: MpCalloutsProps) {
  const [visibleId, setVisibleId] = useState<string | null>(callout?.id ?? null);
  const [prevCalloutId, setPrevCalloutId] = useState<string | null>(callout?.id ?? null);
  if ((callout?.id ?? null) !== prevCalloutId) {
    setPrevCalloutId(callout?.id ?? null);
    setVisibleId(callout?.id ?? null);
  }

  useEffect(() => {
    if (!visibleId) return undefined;
    const timer = setTimeout(() => setVisibleId(null), CALLOUT_MS);
    return () => clearTimeout(timer);
  }, [visibleId]);

  const head = banners[0] ?? null;
  useEffect(() => {
    if (!head) return undefined;
    const timer = setTimeout(onBannerDone, BANNER_MS);
    return () => clearTimeout(timer);
    // Keyed on the head id: a new head restarts the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head?.id]);

  const showCallout = callout && visibleId === callout.id;

  return (
    <div data-testid="mp-callouts" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col items-center gap-2 pt-2">
      {head && (
        <div
          key={head.id}
          data-testid="mp-banner"
          className={cn(
            'rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-1.5 font-neo-display font-bold uppercase shadow-hard-sm animate-mp-drop',
            COLOR[head.color ?? 'cyan'],
          )}
        >
          {head.text}
        </div>
      )}
      {showCallout && (
        <div
          key={callout.id}
          data-testid="mp-callout"
          data-tone={callout.tone ?? 'loud'}
          className={cn(
            'font-neo-display font-bold uppercase',
            callout.tone === 'quiet'
              ? 'text-sm opacity-80 text-neo-white'
              : cn('text-3xl lg:text-5xl drop-shadow-[3px_3px_0_#000] animate-mp-punch', COLOR[callout.color ?? 'lime']),
          )}
        >
          {callout.text}
        </div>
      )}
    </div>
  );
}

export const MpCallouts = memo(MpCalloutsImpl);
MpCallouts.displayName = 'MpCallouts';
