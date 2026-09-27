'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { WifiLow, WifiOff } from 'lucide-react';
import { useNetworkState } from '@/hooks/useNetworkState';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type QualityState = 'good' | 'degraded' | 'weak' | 'offline';

function classify(online: boolean, rttMs: number | null): QualityState {
  if (!online) return 'offline';
  if (rttMs === null || rttMs < 300) return 'good';
  if (rttMs < 1000) return 'degraded';
  return 'weak';
}

/**
 * ROUND's frame (MpRoundLayout) markers — the chip's only contract with ROUND:
 * - canvas: its bottom-start corner is free on phone (the "N found" pill owns
 *   bottom-end, the Type+Enter hint is centred);
 * - rail roster: its parent aside (lg+ only, display:none below) has an empty
 *   end side on the PLAYERS heading row. At lg the canvas corner is board in
 *   Word Hunt (height-bound board runs to the canvas foot), so the rail wins.
 */
const CANVAS_SELECTOR = '[data-testid="mp-round-canvas"]';
const RAIL_ROSTER_SELECTOR = '[data-testid="mp-rail-roster"]';

interface RoundSlots {
  canvas: HTMLElement | null;
  rail: HTMLElement | null;
}
const NO_SLOTS: RoundSlots = { canvas: null, rail: null };

/** The live round frame's slot hosts, tracked as they mount/unmount (only while `enabled`). */
function useRoundSlots(enabled: boolean): RoundSlots {
  const [slots, setSlots] = useState<RoundSlots>(NO_SLOTS);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setSlots(NO_SLOTS);
      return;
    }
    const sync = () => {
      const canvas = document.querySelector<HTMLElement>(CANVAS_SELECTOR);
      const rail = document.querySelector<HTMLElement>(RAIL_ROSTER_SELECTOR)?.parentElement ?? null;
      setSlots((prev) => (prev.canvas === canvas && prev.rail === rail ? prev : { canvas, rail }));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled]);
  return slots;
}

/**
 * Where the chip sits. PageClient's fallback wrapper (`fixed top-14 end-2`) is
 * clear on entry/lobby/results but lands on the phone roster strip and the
 * desktop/TV words-count badge mid-round — so during a round the chip docks in
 * ROUND's free corners instead (logical start/end = RTL-correct). Both round
 * slots render; the breakpoint shows exactly one (canvas lg:hidden, rail <lg
 * display:none), so one status is ever in the a11y tree.
 */
function Placed({ slots, children }: { slots: RoundSlots; children: ReactNode }) {
  if (!slots.canvas && !slots.rail) return <>{children}</>;
  return (
    <>
      {slots.canvas &&
        createPortal(
          <span data-quality-slot="canvas" className="pointer-events-none absolute bottom-1 start-2 z-10 flex lg:hidden">
            {children}
          </span>,
          slots.canvas,
        )}
      {slots.rail &&
        createPortal(
          // Out-of-flow child of the rail's flex column: its static position is
          // the content-box top, and self-end puts it at the inline end of the
          // heading row — beside PLAYERS, no insets to measure.
          <span data-quality-slot="rail" className="pointer-events-none absolute self-end z-10 flex max-w-[65%] -mt-1 tv:mt-0">
            {children}
          </span>,
          slots.rail,
        )}
    </>
  );
}

/**
 * RTT-tier connection signal for the MP shell. Nothing on a healthy link;
 * a small yellow signal dot when degraded; a hard-shadow neo chip when weak or
 * offline. Colour + icon + text, never colour alone.
 */
export function ConnectionQualityChip() {
  const { online, rttMs } = useNetworkState();
  const { t } = useLanguage();
  const state = classify(online, rttMs);
  const slots = useRoundSlots(state !== 'good');

  if (state === 'good') return null;

  if (state === 'degraded') {
    return (
      <Placed slots={slots}>
      <span
        role="status"
        aria-label={t('mp.quality.degraded')}
        data-quality="degraded"
        className="inline-block h-3 w-3 tv:h-5 tv:w-5 rounded-full border-2 border-neo-black bg-neo-yellow shadow-hard-sm"
      />
      </Placed>
    );
  }

  const offline = state === 'offline';
  const Icon = offline ? WifiOff : WifiLow;
  return (
    <Placed slots={slots}>
    <span
      role="status"
      aria-live="polite"
      data-quality={state}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 tv:gap-2 rounded-full border-2 border-neo-black px-2.5 py-0.5 tv:px-4 tv:py-0.5 font-neo-display text-[11px] tv:text-base tv:leading-none font-bold uppercase tracking-wide text-neo-black shadow-hard-sm animate-mp-drop',
        offline ? 'bg-neo-red' : 'bg-neo-yellow',
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 tv:h-5 tv:w-5 shrink-0" />
      <span className="truncate">{offline ? t('mp.quality.reconnecting') : t('mp.quality.weak')}</span>
    </span>
    </Placed>
  );
}
