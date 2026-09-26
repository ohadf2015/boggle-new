'use client';

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
 * RTT-tier connection signal for the MP shell. Nothing on a healthy link;
 * a small yellow signal dot when degraded; a hard-shadow neo chip when weak or
 * offline. Colour + icon + text, never colour alone.
 */
export function ConnectionQualityChip() {
  const { online, rttMs } = useNetworkState();
  const { t } = useLanguage();
  const state = classify(online, rttMs);

  if (state === 'good') return null;

  if (state === 'degraded') {
    return (
      <span
        role="status"
        aria-label={t('mp.quality.degraded')}
        data-quality="degraded"
        className="inline-block h-3 w-3 rounded-full border-2 border-neo-black bg-neo-yellow shadow-hard-sm"
      />
    );
  }

  const offline = state === 'offline';
  const Icon = offline ? WifiOff : WifiLow;
  return (
    <span
      role="status"
      aria-live="polite"
      data-quality={state}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-neo-black px-2.5 py-0.5 font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-black shadow-hard-sm animate-mp-drop',
        offline ? 'bg-neo-red' : 'bg-neo-yellow',
      )}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {offline ? t('mp.quality.reconnecting') : t('mp.quality.weak')}
    </span>
  );
}
