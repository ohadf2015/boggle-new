/**
 * gameMonetizeSdk loader — script injection + idempotency.
 *
 * Web-only. Caller MUST gate on `!isNative && !isCG && !shouldUseH5` before
 * invoking — same gating discipline as h5GamesAds.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadGameMonetizeSdk,
  initGameMonetizeAds,
  getGameMonetizeId,
  __resetGameMonetizeSdkForTests,
  GAMEMONETIZE_SCRIPT_ID,
} from '../gameMonetizeSdk';

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogSuperProps: vi.fn(),
}));

function clearHead(): void {
  while (document.head.firstChild) document.head.removeChild(document.head.firstChild);
}

describe('gameMonetizeSdk loader', () => {
  beforeEach(() => {
    __resetGameMonetizeSdkForTests();
    clearHead();
    delete (window as unknown as { sdk?: unknown }).sdk;
    delete (window as unknown as { SDK_OPTIONS?: unknown }).SDK_OPTIONS;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getGameMonetizeId', () => {
    it('returns NEXT_PUBLIC_GAMEMONETIZE_GAME_ID env var when set', () => {
      vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', 'real-game-id-xyz');
      expect(getGameMonetizeId()).toBe('real-game-id-xyz');
    });

    it('returns null when env var unset (no implicit fallback)', () => {
      vi.stubEnv('NEXT_PUBLIC_GAMEMONETIZE_GAME_ID', '');
      expect(getGameMonetizeId()).toBeNull();
    });
  });

  describe('loadGameMonetizeSdk', () => {
    // happy-dom auto-fires `error` on remote `<script src=https://...>`
    // append. We don't care — these tests verify only the synchronous
    // side-effects (script tag inserted, SDK_OPTIONS populated).
    const swallow = (p: Promise<unknown>) => p.catch(() => {});

    it('injects script tag with id GAMEMONETIZE_SCRIPT_ID exactly once', () => {
      const p1 = loadGameMonetizeSdk('gid-1');
      const p2 = loadGameMonetizeSdk('gid-1');
      swallow(p1); swallow(p2);
      expect(p1).toBe(p2); // same Promise — idempotent

      const script = document.getElementById(GAMEMONETIZE_SCRIPT_ID) as HTMLScriptElement | null;
      expect(script).not.toBeNull();
      expect(script!.src).toContain('api.gamemonetize.com/sdk.js');
      expect(document.querySelectorAll(`#${GAMEMONETIZE_SCRIPT_ID}`)).toHaveLength(1);
    });

    it('sets window.SDK_OPTIONS with provided gameId before injecting script', () => {
      swallow(loadGameMonetizeSdk('gid-config'));
      const opts = (window as unknown as { SDK_OPTIONS?: { gameId?: string } }).SDK_OPTIONS;
      expect(opts?.gameId).toBe('gid-config');
    });

    it('SDK_OPTIONS.onEvent is a function (used to receive SDK events)', () => {
      swallow(loadGameMonetizeSdk('gid-cb'));
      const opts = (window as unknown as { SDK_OPTIONS?: { onEvent?: unknown } }).SDK_OPTIONS;
      expect(typeof opts?.onEvent).toBe('function');
    });
  });

  describe('initGameMonetizeAds', () => {
    it('rejects with gamemonetize-no-game-id when called with empty string', async () => {
      await expect(initGameMonetizeAds('')).rejects.toThrow('gamemonetize-no-game-id');
    });
  });
});
