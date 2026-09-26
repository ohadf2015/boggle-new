'use client';

import { useNetworkState } from '@/hooks/useNetworkState';
import { useLanguage } from '@/contexts/LanguageContext';

type QualityState = 'good' | 'degraded' | 'weak' | 'offline';

function classify(online: boolean, rttMs: number | null): QualityState {
  if (!online) return 'offline';
  if (rttMs === null || rttMs < 300) return 'good';
  if (rttMs < 1000) return 'degraded';
  return 'weak';
}

export function ConnectionQualityChip(){
  const { online, rttMs } = useNetworkState();
  const { t } = useLanguage();
  const state = classify(online, rttMs);

  if (state === 'good') return null;

  if (state === 'degraded') {
    return (
      <span
        role="status"
        aria-label={t('mp.quality.degraded')}
        className="inline-block w-2 h-2 rounded-full bg-neo-yellow animate-pulse"
      />
    );
  }

  const label = state === 'offline' ? t('mp.quality.reconnecting') : t('mp.quality.weak');
  const colorCls = state === 'offline'
    ? 'border-neo-red/40 text-neo-red bg-neo-red/10'
    : 'border-neo-yellow/40 text-neo-yellow bg-neo-yellow/10';

  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-neo-body ${colorCls}`}
    >
      {state === 'offline' && (
        <span className="w-1.5 h-1.5 rounded-full border border-neo-red animate-spin" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}
