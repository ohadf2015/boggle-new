'use client';

import { SpellCheck, X } from 'lucide-react';
import { RESCUE_MS, type useBrace } from './useBrace';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  api: ReturnType<typeof useBrace>;
  reducedMotion: boolean;
}

/**
 * The rescue countdown: while a rescue word is running, show the time remaining
 * and allow cancellation. The offer UI moved to StabilityBrace (in the dock).
 */
export function BraceControl({ t, api, reducedMotion }: Props) {
  const { rescue } = api;

  if (!rescue) return null;

  return (
    <div
      role="status"
      className="absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-30 mx-auto max-w-sm overflow-hidden rounded-neo border-neo-thick border-black bg-neo-cyan shadow-hard"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <SpellCheck className="h-5 w-5 shrink-0 text-neo-navy" aria-hidden />
        <p className="flex-1 font-neo-display text-sm font-black leading-tight text-neo-navy lg:text-base">
          {t('wordTowerV2.brace.rescueNow', { n: rescue.minLen })}
        </p>
        <button
          type="button"
          onClick={api.cancelRescue}
          aria-label={t('wordTowerV2.brace.cancel')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cream text-neo-navy"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {/* Keyed on the deadline so a second rescue restarts the bar. */}
      <div
        key={rescue.until}
        className="h-2 origin-left bg-neo-navy rtl:origin-right"
        style={reducedMotion ? undefined : { animation: `wt2-rescue-clock ${RESCUE_MS}ms linear forwards` }}
      />
      <style>{'@keyframes wt2-rescue-clock{from{transform:scaleX(1)}to{transform:scaleX(0)}}'}</style>
    </div>
  );
}
