// @vitest-environment happy-dom
/**
 * variantCookie — client-side persistence of an already-resolved experiment
 * variant so the NEXT render (and next visit) can seed the variant before the
 * async PostHog flag round-trip resolves. Consent-safe: only replays a variant
 * the client legitimately resolved; never evaluates flags.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  variantCookieName,
  persistVariant,
  readVariantCookie,
} from '../variantCookie';

const KEY = 'landing-modes-cubes-v1';

function clearAllCookies() {
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0].trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

describe('variantCookie', () => {
  beforeEach(clearAllCookies);

  it('namespaces the cookie name by experiment key', () => {
    expect(variantCookieName(KEY)).toBe('exp_landing-modes-cubes-v1');
  });

  it('persists then reads back a valid variant', () => {
    persistVariant(KEY, 'cubes');
    expect(readVariantCookie(KEY)).toBe('cubes');
  });

  it('returns undefined when no cookie is set', () => {
    expect(readVariantCookie(KEY)).toBeUndefined();
  });

  it('ignores a cookie value that is not a known variant for the key', () => {
    document.cookie = `${variantCookieName(KEY)}=bogus; path=/`;
    expect(readVariantCookie(KEY)).toBeUndefined();
  });

  it('overwrites the stored variant when it changes', () => {
    persistVariant(KEY, 'cubes');
    expect(readVariantCookie(KEY)).toBe('cubes');
    persistVariant(KEY, 'control');
    expect(readVariantCookie(KEY)).toBe('control');
  });
});
