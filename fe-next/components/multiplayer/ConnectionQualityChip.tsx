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

/** ROUND's play surface (MpRoundLayout). Its bottom-start corner is free on every
 * size: the phone "N found" pill owns bottom-end, the Type+Enter hint is centred. */
const ROUND_CANVAS_SELECTOR = '[data-testid="mp-round-canvas"]';

/** The live round canvas, tracked as it mounts/unmounts (only while `enabled`). */
function useRoundCanvas(enabled: boolean): HTMLElement | null {
  const [canvas, setCanvas] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      setCanvas(null);
      return;
    }
    const sync = () => {
      const next = document.querySelector<HTMLElement>(ROUND_CANVAS_SELECTOR);
      setCanvas((prev) => (prev === next ? prev : next));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [enabled]);
  return canvas;
}

/**
 * Where the chip sits. PageClient's fallback wrapper (`fixed top-14 end-2`) is
 * clear on entry/lobby/results but lands on the phone roster strip and the
 * desktop/TV words-count badge mid-round — so during a round the chip docks in
 * the canvas's bottom-start corner (logical `start` = RTL-correct).
 */
function Placed({ canvas, children }: { canvas: HTMLElement | null; children: ReactNode }) {
  if (!canvas) return <>{children}</>;
  return createPortal(
    <span data-quality-slot="round" className="pointer-events-none absolute bottom-1 start-2 z-10 flex">
      {children}
    </span>,
    canvas,
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
  const canvas = useRoundCanvas(state !== 'good');

  if (state === 'good') return null;

  if (state === 'degraded') {
    return (
      <Placed canvas={canvas}>
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
    <Placed canvas={canvas}>
    <span
      role="status"
      aria-live="polite"
      data-quality={state}
      className={cn(
        'inline-flex items-center gap-1.5 tv:gap-2 rounded-full border-2 border-neo-black px-2.5 py-0.5 tv:px-4 tv:py-1 font-neo-display text-[11px] tv:text-base font-bold uppercase tracking-wide text-neo-black shadow-hard-sm animate-mp-drop',
        offline ? 'bg-neo-red' : 'bg-neo-yellow',
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5 tv:h-5 tv:w-5" />
      {offline ? t('mp.quality.reconnecting') : t('mp.quality.weak')}
    </span>
    </Placed>
  );
}
