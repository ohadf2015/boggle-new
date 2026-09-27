import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  showRewardedAyet,
  getAyetPlacementId,
  __resetAyetSdkForTests,
} from '../ayetVideoAds';

describe('ayetVideoAds — rewarded watch correlation', () => {
  beforeEach(() => __resetAyetSdkForTests());

  it('resolves true when callbackRewarded fires (video completed + fraud-checked)', async () => {
    // ayeT contract: reward iff callbackRewarded fires; callbackComplete (close)
    // alone must NOT reward.
    const driveAd = (cbs: { onReward: () => void; onClose: () => void }) => {
      cbs.onReward();
      cbs.onClose(); // player closes after the reward
    };

    await expect(showRewardedAyet({ driveAd })).resolves.toBe(true);
  });

  it('resolves false when the player closes without a reward (callbackComplete only)', async () => {
    const driveAd = (cbs: { onClose: () => void }) => {
      cbs.onClose();
    };

    await expect(showRewardedAyet({ driveAd })).resolves.toBe(false);
  });

  it('rejects when requestAd errors (no fill / SDK blocked)', async () => {
    const driveAd = (cbs: { onError: (e: string) => void }) => {
      cbs.onError('ayet-no-fill');
    };

    await expect(showRewardedAyet({ driveAd })).rejects.toThrow('ayet-no-fill');
  });

  it('settles once — a reward followed by a close stays true', async () => {
    const driveAd = (cbs: { onReward: () => void; onClose: () => void }) => {
      cbs.onReward();
      cbs.onClose();
      cbs.onClose();
    };

    await expect(showRewardedAyet({ driveAd })).resolves.toBe(true);
  });

  it('does not leak a prior reward into the next call', async () => {
    await showRewardedAyet({ driveAd: (c: { onReward: () => void }) => c.onReward() });
    const second = await showRewardedAyet({ driveAd: (c: { onClose: () => void }) => c.onClose() });
    expect(second).toBe(false);
  });
});

describe('ayetVideoAds — placement id resolution', () => {
  const original = process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID;
  beforeEach(() => __resetAyetSdkForTests());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID;
    else process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID = original;
  });

  it('reads the placement id from NEXT_PUBLIC_AYET_PLACEMENT_ID', () => {
    process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID = '12345';
    expect(getAyetPlacementId()).toBe('12345');
  });

  it('returns empty string when unset (stays dark)', () => {
    delete process.env.NEXT_PUBLIC_AYET_PLACEMENT_ID;
    expect(getAyetPlacementId()).toBe('');
  });
});
