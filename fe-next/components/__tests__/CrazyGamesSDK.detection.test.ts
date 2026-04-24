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
});
