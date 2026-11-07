import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import HintButton from '../HintButton';
import { FREE_HINTS_KEY } from '@/lib/connections/freeHints';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: 'control', trackExposure: vi.fn() }),
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({ status: 'idle', canShowAd: true, rewardAmount: 0, isPlaceholder: false, showAd: vi.fn() }),
}));
const offered = vi.hoisted(() => vi.fn());
vi.mock('@/utils/growthTracking', () => ({ trackRewardedAdOffered: offered }));

const day = () => new Date().toISOString().slice(0, 10);

function ui(disabled: boolean) {
  return (
    <HintButton
      hasHint
      hintRevealed={false}
      isAdmin={false}
      disabled={disabled}
      wrongAttempts={0}
      onRevealHint={vi.fn()}
      adContext={{ puzzleId: 'p1' }}
    />
  );
}

describe('HintButton rewarded_ad_offered', () => {
  beforeEach(() => {
    window.localStorage.clear();
    offered.mockClear();
  });

  it('does not track an offer while a free hint is still available', () => {
    render(ui(false));
    expect(offered).not.toHaveBeenCalled();
  });

  it('tracks one offer when the transient disabled prop toggles while the ad button shows', () => {
    window.localStorage.setItem(FREE_HINTS_KEY, `${day()}:1`);
    const { rerender } = render(ui(false));
    rerender(ui(true));
    rerender(ui(false));
    expect(offered).toHaveBeenCalledTimes(1);
  });
});
