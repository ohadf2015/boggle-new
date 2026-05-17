import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdMobProvider, useAdMobContext } from '../AdMobContext';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
    isPluginAvailable: vi.fn(() => true),
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    requestConsentInfo: vi.fn(() => Promise.resolve({ status: 'NOT_REQUIRED', canRequestAds: true })),
    showConsentForm: vi.fn(() => Promise.resolve({ status: 'OBTAINED', canRequestAds: true })),
  },
  AdmobConsentStatus: {
    UNKNOWN: 'UNKNOWN',
    NOT_REQUIRED: 'NOT_REQUIRED',
    REQUIRED: 'REQUIRED',
    OBTAINED: 'OBTAINED',
  },
}));

import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';

function TestConsumer({ onMount }: { onMount: (ctx: ReturnType<typeof useAdMobContext>) => void }) {
  const ctx = useAdMobContext();
  onMount(ctx);
  return null;
}

describe('AdMobProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not initialize AdMob on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const onMount = vi.fn();
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={onMount} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).not.toHaveBeenCalled();
  });

  it('initializes AdMob on native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.initialize).toHaveBeenCalledWith({ initializeForTesting: true });
  });

  it('requests UMP consent BEFORE AdMob.initialize on native (EU/GDPR gate)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    const order: string[] = [];
    vi.mocked(AdMob.requestConsentInfo).mockImplementationOnce(async () => {
      order.push('requestConsentInfo');
      return { status: 'NOT_REQUIRED' as never, canRequestAds: true };
    });
    vi.mocked(AdMob.initialize).mockImplementationOnce(async () => {
      order.push('initialize');
    });
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(order).toEqual(['requestConsentInfo', 'initialize']);
  });

  it('shows UMP consent form when status === REQUIRED and form available', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValueOnce({
      status: 'REQUIRED' as never,
      isConsentFormAvailable: true,
      canRequestAds: false,
    } as never);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.showConsentForm).toHaveBeenCalled();
  });

  it('skips showConsentForm when status === NOT_REQUIRED (non-EEA)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockResolvedValueOnce({
      status: 'NOT_REQUIRED' as never,
      canRequestAds: true,
    } as never);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.showConsentForm).not.toHaveBeenCalled();
    expect(AdMob.initialize).toHaveBeenCalled();
  });

  it('still initializes AdMob even if requestConsentInfo throws (graceful degrade)', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    vi.mocked(AdMob.requestConsentInfo).mockRejectedValueOnce(new Error('UMP network fail'));
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await captured!.whenReady();
    expect(AdMob.initialize).toHaveBeenCalled();
  });

  it('does NOT call requestConsentInfo on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={vi.fn()} />
        </AdMobProvider>
      );
    });
    expect(AdMob.requestConsentInfo).not.toHaveBeenCalled();
  });

  it('hasNoAds returns false (stub)', async () => {
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.hasNoAds()).toBe(false);
  });

  it('shouldShowInterstitial returns false during warmup (first 3 game ends)', async () => {
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    captured!.recordGameEnd();
    captured!.recordGameEnd();
    captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('shouldShowInterstitial returns true on 3rd game after warmup', async () => {
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    captured!.recordGameEnd(); // 1
    captured!.recordGameEnd(); // 2
    captured!.recordGameEnd(); // 3
    captured!.recordGameEnd(); // 4
    captured!.recordGameEnd(); // 5
    captured!.recordGameEnd(); // 6
    expect(captured!.shouldShowInterstitial()).toBe(true);
  });

  it('caps interstitials at MAX_INTERSTITIALS_PER_SESSION (4) regardless of game-end count', async () => {
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    // Warmup (3 game-ends, no ads)
    for (let i = 0; i < 3; i++) captured!.recordGameEnd();
    // Four eligible cycles: each = 3 more game-ends, gate true, record show
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) captured!.recordGameEnd();
      expect(captured!.shouldShowInterstitial()).toBe(true);
      captured!.recordInterstitialShown();
    }
    // 5th eligible cycle: gate must now block on session cap
    for (let j = 0; j < 3; j++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(false);
  });

  it('recordInterstitialShown only blocks after cap reached, not before', async () => {
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    // Warmup + 1 cycle, record only 1 show
    for (let i = 0; i < 6; i++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(true);
    captured!.recordInterstitialShown();
    // Cap not reached — gate should still pass on next eligible cycle
    for (let j = 0; j < 3; j++) captured!.recordGameEnd();
    expect(captured!.shouldShowInterstitial()).toBe(true);
  });

  it('getConfig returns null on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    expect(captured!.getConfig()).toBeNull();
  });

  it('exposes whenReady() that resolves after AdMob.initialize settles on native', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    let resolveInit: (() => void) | null = null;
    vi.mocked(AdMob.initialize).mockImplementationOnce(
      () => new Promise<void>((res) => { resolveInit = () => res(); })
    );
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    let resolved = false;
    const ready = captured!.whenReady().then(() => { resolved = true; });
    await Promise.resolve();
    expect(resolved).toBe(false);
    resolveInit!();
    await ready;
    expect(resolved).toBe(true);
  });

  it('whenReady() resolves immediately on web', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    let captured: ReturnType<typeof useAdMobContext> | null = null;
    await act(async () => {
      render(
        <AdMobProvider>
          <TestConsumer onMount={(ctx) => { captured = ctx; }} />
        </AdMobProvider>
      );
    });
    await expect(captured!.whenReady()).resolves.toBeUndefined();
  });

  it('throws when used outside provider', () => {
    expect(() => {
      render(<TestConsumer onMount={vi.fn()} />);
    }).toThrow('useAdMobContext must be used within AdMobProvider');
  });
});
