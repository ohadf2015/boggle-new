import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  showRewardedGd,
  handleGdEvent,
  getGdGameId,
  __resetGdSdkForTests,
} from '../gameDistributionAds';

describe('gameDistributionAds — rewarded watch correlation', () => {
  beforeEach(() => __resetGdSdkForTests());

  it('grants reward when SDK_REWARDED_WATCH_COMPLETE fires before showAd resolves', async () => {
    // GD contract: the watch-complete event fires, THEN content resumes and the
    // showAd() promise resolves. Reward is owed iff the event was seen.
    const showAdFn = () =>
      new Promise<void>((resolve) => {
        handleGdEvent('SDK_REWARDED_WATCH_COMPLETE'); // user watched to the end
        resolve(); // SDK_GAME_START → content resumes
      });

    const watched = await showRewardedGd({ showAdFn });

    expect(watched).toBe(true);
  });

  it('does NOT grant reward when the ad is closed early (no watch-complete event)', async () => {
    const showAdFn = () => Promise.resolve(); // resumed without a watch-complete

    const watched = await showRewardedGd({ showAdFn });

    expect(watched).toBe(false);
  });

  it('propagates rejection when showAd throws (no fill / adblock)', async () => {
    const showAdFn = () => Promise.reject(new Error('gd-no-fill'));

    await expect(showRewardedGd({ showAdFn })).rejects.toThrow('gd-no-fill');
  });

  it('resets watch state per call — a prior watched ad does not leak into the next', async () => {
    await showRewardedGd({
      showAdFn: () => {
        handleGdEvent('SDK_REWARDED_WATCH_COMPLETE');
        return Promise.resolve();
      },
    });

    const second = await showRewardedGd({ showAdFn: () => Promise.resolve() });

    expect(second).toBe(false);
  });

  it('ignores non-reward lifecycle events (pause/resume do not grant a reward)', async () => {
    const showAdFn = () => {
      handleGdEvent('SDK_GAME_PAUSE');
      handleGdEvent('SDK_GAME_START');
      return Promise.resolve();
    };

    const watched = await showRewardedGd({ showAdFn });

    expect(watched).toBe(false);
  });
});

describe('gameDistributionAds — game id resolution', () => {
  const original = process.env.NEXT_PUBLIC_GD_GAME_ID;
  beforeEach(() => __resetGdSdkForTests());
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_GD_GAME_ID;
    else process.env.NEXT_PUBLIC_GD_GAME_ID = original;
  });

  it('reads the game id from NEXT_PUBLIC_GD_GAME_ID', () => {
    process.env.NEXT_PUBLIC_GD_GAME_ID = 'abc123hash';
    expect(getGdGameId()).toBe('abc123hash');
  });

  it('returns empty string when no game id is configured (stays dark)', () => {
    delete process.env.NEXT_PUBLIC_GD_GAME_ID;
    expect(getGdGameId()).toBe('');
  });
});
