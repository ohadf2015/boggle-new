/**
 * useSharePromptImpression - Emit A/B exposure for share-prompt-timing variants.
 *
 * Fires share_win_prompt_shown once per session with the resolved variant so
 * PostHog funnels can compare share rate between `immediate` vs `results-page`.
 */
import { useEffect } from 'react';
import { trackGrowthEvent } from '@/utils/growthTracking';

const SHARE_PROMPT_SHOWN_KEY = 'boggle_sp_share_prompt_shown';

interface Params {
  variant: string;
  enabled: boolean;
}

export function useSharePromptImpression({ variant, enabled }: Params): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(SHARE_PROMPT_SHOWN_KEY)) return;

    sessionStorage.setItem(SHARE_PROMPT_SHOWN_KEY, 'true');
    trackGrowthEvent('share_win_prompt_shown', { variant });
  }, [enabled, variant]);
}
