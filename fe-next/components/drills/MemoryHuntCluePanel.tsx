'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { Lightbulb, Clapperboard, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';
import { AD_CLUE_GRANT } from './useMemoryHuntGame';

interface MemoryHuntCluePanelProps {
  hintsRemaining: number;
  isHintActive: boolean;
  onUseClue: () => void;
  onGrantClues: (amount: number) => void;
  t: (key: string) => string;
}

/**
 * Clue control for Memory Hunt.
 * - hints left  → "Use clue (N)" lights up a word's path.
 * - out of clues → unlock more. On native (AdMob) this is a rewarded ad; on web
 *   with no ad provider we still grant them free, because a player stuck on the
 *   hardest level must be able to get help — we just can't monetize that surface.
 */
export function MemoryHuntCluePanel({
  hintsRemaining,
  isHintActive,
  onUseClue,
  onGrantClues,
  t,
}: MemoryHuntCluePanelProps) {
  const [justGranted, setJustGranted] = useState(false);
  const offeredRef = useRef(false);

  const grant = useCallback(() => {
    onGrantClues(AD_CLUE_GRANT);
    setJustGranted(true);
    setTimeout(() => setJustGranted(false), 1400);
  }, [onGrantClues]);

  const { showAd, prepareAd, status, canShowAd = true } = useRewardedAd({
    surface: 'hint',
    analyticsSurface: 'drill_clue',
    rewardKind: 'feature', // we grant clues ourselves; don't auto-pay coins
    onRewardEarned: grant,
  });

  const outOfClues = hintsRemaining <= 0;
  const isLoadingAd = status === 'loading' || status === 'showing';

  // Warm the ad slot once, only when a real provider can serve.
  useEffect(() => {
    if (!outOfClues || !canShowAd || offeredRef.current) return;
    offeredRef.current = true;
    trackRewardedAdOffered('drill_clue');
    prepareAd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfClues, canShowAd]);

  const handleUnlock = useCallback(() => {
    if (canShowAd) showAd(); // reward callback grants the clues
    else grant(); // web fallback: grant for free
  }, [canShowAd, showAd, grant]);

  if (!outOfClues) {
    return (
      <AdaptiveMotion.button
        whileTap={{ scale: 0.95 }}
        onClick={onUseClue}
        disabled={isHintActive}
        aria-label={t('brain.drills.useHint')}
        className={cn(
          'relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard',
          'font-black text-sm uppercase tracking-wide',
          'transition-all hover:-translate-y-px active:shadow-hard-pressed',
          isHintActive
            ? 'bg-neo-lime text-neo-black cursor-not-allowed'
            : 'bg-neo-yellow text-neo-black hover:bg-neo-lime',
        )}
      >
        <Lightbulb className="w-5 h-5" />
        {t('brain.drills.useHint')}
        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full border-2 border-neo-black bg-neo-black/15 font-black tabular-nums">
          {hintsRemaining}
        </span>
        <AdaptiveAnimatePresence>
          {justGranted && (
            <AdaptiveMotion.span
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: -2, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute -top-3 right-2 px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-lime text-neo-black text-xs font-black"
            >
              +{AD_CLUE_GRANT}
            </AdaptiveMotion.span>
          )}
        </AdaptiveAnimatePresence>
      </AdaptiveMotion.button>
    );
  }

  return (
    <AdaptiveMotion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleUnlock}
      disabled={isLoadingAd}
      aria-label={canShowAd ? t('brain.drills.clue.watchAd') : t('brain.drills.clue.unlock')}
      className={cn(
        'relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-neo border-3 border-neo-black shadow-hard overflow-hidden',
        'font-black text-sm uppercase tracking-wide',
        'transition-all hover:-translate-y-px active:shadow-hard-pressed',
        'bg-neo-cyan text-neo-black hover:brightness-95 disabled:opacity-60 disabled:cursor-wait',
      )}
    >
      {isLoadingAd ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : canShowAd ? (
        <Clapperboard className="w-5 h-5" />
      ) : (
        <Sparkles className="w-5 h-5" />
      )}
      <span>
        {isLoadingAd
          ? t('brain.drills.clue.loading')
          : canShowAd
            ? t('brain.drills.clue.watchAd')
            : t('brain.drills.clue.unlock')}
      </span>
    </AdaptiveMotion.button>
  );
}

export default MemoryHuntCluePanel;
