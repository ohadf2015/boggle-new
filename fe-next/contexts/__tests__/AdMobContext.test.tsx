import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AdMobProvider, useAdMobContext } from '../AdMobContext';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
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
