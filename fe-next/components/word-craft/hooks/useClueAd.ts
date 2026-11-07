import { useEffect, useRef } from 'react';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { isNative } from '@/utils/platform';

interface UseClueAdOptions {
  grantClue: () => void;
  cluesRemaining: number;
  onFailed: () => void;
}

/** Rewarded ad for the clue after the free ones are spent; web has no ad path and the caller grants directly. */
export function useClueAd({ grantClue, cluesRemaining, onFailed }: UseClueAdOptions) {
  const isAdClue = isNative() && cluesRemaining <= 0;
  const ad = useRewardedFeatureUnlock({
    placement: 'wordcraft_clue',
    surface: 'hint',
    onUnlock: grantClue,
    disabled: !isAdClue,
  });
  const busy = ad.status === 'loading' || ad.status === 'showing';

  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  useEffect(() => {
    if (ad.status === 'error') onFailedRef.current();
  }, [ad.status]);

  // A capped or unavailable ad declines without a status change; say so rather than ignore the tap.
  const offer = () => {
    if (!ad.canShowAd) {
      onFailedRef.current();
      return;
    }
    ad.offer();
  };

  return { isAdClue, busy, offer };
}
