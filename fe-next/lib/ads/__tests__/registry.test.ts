import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdRegistry } from '../registry';
import type { AdProvider } from '../types';

function makeProvider(overrides: Partial<AdProvider> & Pick<AdProvider, 'id' | 'priority'>): AdProvider {
  return {
    isAvailable: () => true,
    ...overrides,
  } as AdProvider;
}

describe('AdRegistry', () => {
  let registry: AdRegistry;

  beforeEach(() => {
    registry = new AdRegistry();
  });

  describe('register / unregister', () => {
    it('starts empty', () => {
      expect(registry.list()).toEqual([]);
    });

    it('register adds a provider', () => {
      const p = makeProvider({ id: 'admob', priority: 50 });
      registry.register(p);
      expect(registry.list().map((x) => x.id)).toEqual(['admob']);
    });

    it('register replaces same-id provider (idempotent)', () => {
      registry.register(makeProvider({ id: 'admob', priority: 50 }));
      registry.register(makeProvider({ id: 'admob', priority: 99 }));
      const list = registry.list();
      expect(list).toHaveLength(1);
      expect(list[0].priority).toBe(99);
    });

    it('unregister removes by id', () => {
      registry.register(makeProvider({ id: 'admob', priority: 50 }));
      registry.register(makeProvider({ id: 'cg', priority: 100 }));
      registry.unregister('admob');
      expect(registry.list().map((x) => x.id)).toEqual(['cg']);
    });

    it('unregister of unknown id is a no-op', () => {
      registry.register(makeProvider({ id: 'admob', priority: 50 }));
      expect(() => registry.unregister('nope')).not.toThrow();
      expect(registry.list()).toHaveLength(1);
    });
  });

  describe('selectFor', () => {
    it('returns null when no providers registered', () => {
      expect(registry.selectFor('rewarded')).toBeNull();
    });

    it('returns highest-priority provider that is available for the slot', () => {
      registry.register(makeProvider({ id: 'admob', priority: 50, showRewarded: vi.fn() }));
      registry.register(makeProvider({ id: 'cg', priority: 100, showRewarded: vi.fn() }));
      registry.register(makeProvider({ id: 'placeholder', priority: 0, showRewarded: vi.fn() }));
      expect(registry.selectFor('rewarded')?.id).toBe('cg');
    });

    it('skips providers where isAvailable returns false', () => {
      registry.register(makeProvider({ id: 'cg', priority: 100, isAvailable: () => false, showRewarded: vi.fn() }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showRewarded: vi.fn() }));
      expect(registry.selectFor('rewarded')?.id).toBe('admob');
    });

    it('checks isAvailable per slot kind', () => {
      registry.register(
        makeProvider({
          id: 'cg',
          priority: 100,
          isAvailable: (k) => k === 'rewarded',
          showRewarded: vi.fn(),
          showBanner: vi.fn(),
        }),
      );
      expect(registry.selectFor('rewarded')?.id).toBe('cg');
      expect(registry.selectFor('banner')).toBeNull();
    });

    it('skips providers that lack the slot method even when isAvailable is true', () => {
      registry.register(makeProvider({ id: 'cg', priority: 100 /* no showBanner */ }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showBanner: vi.fn() }));
      expect(registry.selectFor('banner')?.id).toBe('admob');
    });
  });

  describe('showRewarded', () => {
    it('returns rewarded:false with no provider error when nothing registered', async () => {
      const result = await registry.showRewarded({ surface: 'generic' });
      expect(result.rewarded).toBe(false);
      expect(result.provider).toBeUndefined();
    });

    it('delegates to highest-priority provider and returns its result with provider id', async () => {
      const cgShow = vi.fn().mockResolvedValue({ rewarded: true });
      registry.register(makeProvider({ id: 'cg', priority: 100, showRewarded: cgShow }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showRewarded: vi.fn() }));

      const result = await registry.showRewarded({ surface: 'doubleGold' });
      expect(cgShow).toHaveBeenCalledWith({ surface: 'doubleGold' });
      expect(result).toEqual({ rewarded: true, provider: 'cg' });
    });

    it('falls through to next provider when first returns rewarded:false', async () => {
      const cgShow = vi.fn().mockResolvedValue({ rewarded: false });
      const admobShow = vi.fn().mockResolvedValue({ rewarded: true });
      registry.register(makeProvider({ id: 'cg', priority: 100, showRewarded: cgShow }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showRewarded: admobShow }));

      const result = await registry.showRewarded({ surface: 'generic' });
      expect(cgShow).toHaveBeenCalledOnce();
      expect(admobShow).toHaveBeenCalledOnce();
      expect(result).toEqual({ rewarded: true, provider: 'admob' });
    });

    it('falls through when first provider throws', async () => {
      const cgShow = vi.fn().mockRejectedValue(new Error('CG SDK unavailable'));
      const admobShow = vi.fn().mockResolvedValue({ rewarded: true });
      registry.register(makeProvider({ id: 'cg', priority: 100, showRewarded: cgShow }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showRewarded: admobShow }));

      const result = await registry.showRewarded({ surface: 'generic' });
      expect(result.rewarded).toBe(true);
      expect(result.provider).toBe('admob');
    });

    it('returns rewarded:false with last error when all providers fail', async () => {
      registry.register(
        makeProvider({ id: 'cg', priority: 100, showRewarded: vi.fn().mockResolvedValue({ rewarded: false, error: 'no fill' }) }),
      );
      registry.register(
        makeProvider({ id: 'admob', priority: 50, showRewarded: vi.fn().mockResolvedValue({ rewarded: false, error: 'no network' }) }),
      );

      const result = await registry.showRewarded({ surface: 'generic' });
      expect(result.rewarded).toBe(false);
      expect(result.error).toBe('no network');
    });
  });

  describe('showInterstitial', () => {
    it('returns shown:false when no providers', async () => {
      const r = await registry.showInterstitial({ placement: 'daily-complete' });
      expect(r.shown).toBe(false);
    });

    it('delegates to provider with showInterstitial', async () => {
      const cgShow = vi.fn().mockResolvedValue({ shown: true });
      registry.register(makeProvider({ id: 'cg', priority: 100, showInterstitial: cgShow }));
      const r = await registry.showInterstitial({ placement: 'multiplayer-round-complete' });
      expect(cgShow).toHaveBeenCalledWith({ placement: 'multiplayer-round-complete' });
      expect(r).toEqual({ shown: true, provider: 'cg' });
    });

    it('falls through on shown:false', async () => {
      registry.register(
        makeProvider({ id: 'cg', priority: 100, showInterstitial: vi.fn().mockResolvedValue({ shown: false }) }),
      );
      registry.register(
        makeProvider({ id: 'admob', priority: 50, showInterstitial: vi.fn().mockResolvedValue({ shown: true }) }),
      );
      const r = await registry.showInterstitial({ placement: 'daily-complete' });
      expect(r).toEqual({ shown: true, provider: 'admob' });
    });
  });

  describe('showBanner / hideBanner', () => {
    it('delegates banner show to highest-priority banner-capable provider', async () => {
      const admobShow = vi.fn().mockResolvedValue({ shown: true });
      registry.register(
        makeProvider({ id: 'cg', priority: 100, isAvailable: (k) => k !== 'banner' /* CG has no banner */ }),
      );
      registry.register(makeProvider({ id: 'admob', priority: 50, showBanner: admobShow }));

      const r = await registry.showBanner({ variant: 'content', margin: 64 });
      expect(admobShow).toHaveBeenCalledWith({ variant: 'content', margin: 64 });
      expect(r).toEqual({ shown: true, provider: 'admob' });
    });

    it('hideBanner is a no-op when no banner-capable provider', async () => {
      await expect(registry.hideBanner()).resolves.toBeUndefined();
    });

    it('hideBanner calls all banner-capable providers (so a re-show by any is killed)', async () => {
      const cgHide = vi.fn().mockResolvedValue(undefined);
      const admobHide = vi.fn().mockResolvedValue(undefined);
      registry.register(makeProvider({ id: 'cg', priority: 100, showBanner: vi.fn(), hideBanner: cgHide }));
      registry.register(makeProvider({ id: 'admob', priority: 50, showBanner: vi.fn(), hideBanner: admobHide }));

      await registry.hideBanner();
      expect(cgHide).toHaveBeenCalled();
      expect(admobHide).toHaveBeenCalled();
    });
  });
});
