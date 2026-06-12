'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { BlastTileType } from './types';
import { getTileTooltip } from './utils/blastTileTooltips';

const AUTO_DISMISS_MS = 6500;

interface BlastTileFirstUseCalloutProps {
  type: BlastTileType;
  onDismiss: () => void;
}

/**
 * Small non-blocking callout that names a special tile and says what it does
 * the first time the player meets it. Auto-dismisses; the "Got it" button lets
 * the player close it early. Pointer-events are off except the button so the
 * board stays fully playable underneath. RTL flips via logical CSS + dir.
 */
export function BlastTileFirstUseCallout({ type, onDismiss }: BlastTileFirstUseCalloutProps) {
  const { t } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();
  const tip = getTileTooltip(type, t);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const id = window.setTimeout(() => dismissRef.current(), AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [type]);

  if (!tip) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-3"
      aria-live="polite"
    >
      <div
        data-testid="blast-tile-first-use"
        className={`pointer-events-auto flex max-w-xs items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-2 text-neo-cream shadow-hard ${reducedMotion ? '' : 'animate-neo-pop'}`}
        role="status"
      >
        <span className="text-2xl leading-none" aria-hidden="true">{tip.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-neo-display text-sm font-bold leading-tight text-neo-lime">{tip.name}</p>
          <p className="font-neo-body text-xs leading-snug text-neo-cream/90">{tip.desc}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-neo border-neo border-black bg-neo-lime px-2 py-1 font-neo-body text-xs font-bold text-black shadow-hard-sm active:animate-neo-press"
        >
          {t('blast.firstUse.gotIt', 'Got it')}
        </button>
      </div>
    </div>
  );
}

export default BlastTileFirstUseCallout;
