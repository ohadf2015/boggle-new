import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectCrazyGamesSync } from '../CrazyGamesSDK';

describe('detectCrazyGamesSync', () => {
  const originalLocation = window.location;
  const originalReferrer =
    Object.getOwnPropertyDescriptor(document, 'referrer') ??
    Object.getOwnPropertyDescriptor(Document.prototype, 'referrer');

  beforeEach(() => {
    delete (window as unknown as { __crazyGamesEnvironment?: string }).__crazyGamesEnvironment;
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
    if (originalReferrer) Object.defineProperty(document, 'referrer', originalReferrer);
    vi.restoreAllMocks();
  });

  function stubLocation(hostname: string, ancestors: string[] = []) {
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, hostname, ancestorOrigins: ancestors },
      configurable: true,
    });
  }
  function stubReferrer(value: string) {
    Object.defineProperty(document, 'referrer', { value, configurable: true });
  }

  it('returns true when embedded under crazygames.com ancestor', () => {
    stubLocation('example.com', ['https://www.crazygames.com']);
    expect(detectCrazyGamesSync()).toBe(true);
  });

  it('returns true when referrer is crazygames.com', () => {
    stubLocation('example.com', []);
    stubReferrer('https://www.crazygames.com/game/x');
    expect(detectCrazyGamesSync()).toBe(true);
  });

  it('returns true on icecream.me preview host', () => {
    stubLocation('icecream.me', []);
    stubReferrer('');
    expect(detectCrazyGamesSync()).toBe(true);
  });

  it('returns true on icecream.me subdomain preview host', () => {
    stubLocation('foo.icecream.me', []);
    stubReferrer('');
    expect(detectCrazyGamesSync()).toBe(true);
  });

  it('returns false on unrelated host', () => {
    stubLocation('example.com', []);
    stubReferrer('');
    expect(detectCrazyGamesSync()).toBe(false);
  });


  it('does NOT force-on when NEXT_PUBLIC_CRAZYGAMES_ENABLED=true (env governs SDK script load only)', () => {
    // Regression: a previous version returned true unconditionally when this
    // env var was 'true'. Because Next inlines NEXT_PUBLIC_* at build time,
    // every prod client then mis-detected as a CrazyGames embed → hid the
    // global bottom nav, mobile menu, and external auth on the public site.
    vi.stubEnv('NEXT_PUBLIC_CRAZYGAMES_ENABLED', 'true');
    stubLocation('example.com', []);
    stubReferrer('');
    expect(detectCrazyGamesSync()).toBe(false);
    vi.unstubAllEnvs();
  });

  it('returns true in cross-origin iframe even without ancestorOrigins/referrer (Firefox/Brave)', () => {
    // Firefox: no ancestorOrigins. Strict referrer-policy: empty referrer.
    // Game URL has no "crazygames"/"icecream" hint. Distinguishing signal is that
    // `window.parent` is cross-origin → reading `parent.location.href` throws.
    stubLocation('lexiclash.app', []);
    stubReferrer('');
    const fakeParent = {
      get location(): never {
        throw new DOMException('cross-origin', 'SecurityError');
      },
    };
    const originalSelf = window.self;
    const originalTop = window.top;
    const originalParent = window.parent;
    Object.defineProperty(window, 'self', { value: {}, configurable: true });
    Object.defineProperty(window, 'top', { value: {}, configurable: true });
    Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
    try {
      expect(detectCrazyGamesSync()).toBe(true);
    } finally {
      Object.defineProperty(window, 'self', { value: originalSelf, configurable: true });
      Object.defineProperty(window, 'top', { value: originalTop, configurable: true });
      Object.defineProperty(window, 'parent', { value: originalParent, configurable: true });
    }
  });

  it('returns false in same-origin iframe (Storybook, dev preview)', () => {
    // Same-origin iframe: parent.location.href is readable → not a portal embed.
    stubLocation('lexiclash.app', []);
    stubReferrer('');
    const fakeParent = { location: { href: 'https://lexiclash.app/preview' } };
    const originalSelf = window.self;
    const originalTop = window.top;
    const originalParent = window.parent;
    Object.defineProperty(window, 'self', { value: {}, configurable: true });
    Object.defineProperty(window, 'top', { value: {}, configurable: true });
    Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
    try {
      expect(detectCrazyGamesSync()).toBe(false);
    } finally {
      Object.defineProperty(window, 'self', { value: originalSelf, configurable: true });
      Object.defineProperty(window, 'top', { value: originalTop, configurable: true });
      Object.defineProperty(window, 'parent', { value: originalParent, configurable: true });
    }
  });
});
