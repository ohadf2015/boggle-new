'use client';

/**
 * BlastHintButton — surfaces the wave-6+ hint flow.
 *
 * - First click in a run: spends the free hint (no ad).
 * - Later clicks: triggers a rewarded ad via useRewardedFeatureUnlock,
 *   which only resolves when the user actually finishes the ad. The
 *   reward callback then consumes the ad-gated hint.
 *
 * When the player has no real ad provider AND the free hint is gone,
 * the button hides itself — there's nothing to offer.
 */

import { useCallback } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';

interface BlastHintButtonProps {
  waveNumber: number;
  unlocked: boolean;
  freeAvailable: boolean;
  /** Caller's free-hint consumer. Returns null if nothing actionable. */
  onFreeHint: () => void;
  /** Caller's ad-hint consumer — invoked AFTER rewarded ad rewards. */
  onAdHint: () => void;
  t: (key: string) => string | undefined;
}

export function BlastHintButton({
  waveNumber,
  unlocked,
  freeAvailable,
  onFreeHint,
  onAdHint,
  t,
}: BlastHintButtonProps) {
  const { offer, canShowAd } = useRewardedFeatureUnlock({
    placement: 'blast_hint',
    surface: 'hint',
    onUnlock: () => onAdHint(),
    context: { wave: waveNumber },
    disabled: !unlocked || freeAvailable,
  });

  const handleClick = useCallback(() => {
    if (freeAvailable) {
      onFreeHint();
      return;
    }
    if (canShowAd) offer();
  }, [freeAvailable, canShowAd, offer, onFreeHint]);

  // Hide entirely when there's nothing to spend
  if (!unlocked) return null;
  if (!freeAvailable && !canShowAd) return null;

  const ariaLabel = freeAvailable
    ? (t('blast.hint.aria.free') || 'Hint (free)')
    : (t('blast.hint.aria.ad') || 'Hint (watch ad)');

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="blast-hint-btn"
      data-mode={freeAvailable ? 'free' : 'ad'}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        'shrink-0 inline-flex items-center gap-1 rounded-lg border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-hard transition-transform active:translate-y-px',
        freeAvailable ? 'bg-neo-yellow text-neo-navy animate-neo-pop' : 'bg-neo-cyan text-neo-navy',
      )}
    >
      <Lightbulb className="h-3 w-3" strokeWidth={3} />
      <span>{freeAvailable ? (t('blast.hint.free') || 'FREE') : (t('blast.hint.ad') || 'HINT')}</span>
    </button>
  );
}

export default BlastHintButton;
