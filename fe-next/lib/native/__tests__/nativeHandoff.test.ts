import { describe, it, expect } from 'vitest';
import { isNativeAppUserAgent, nativeHandoffRoute } from '../nativeHandoff';
import { KNOWN_APP_ROOT_SEGMENTS } from '@/lib/seo/nextHandleGate';

describe('isNativeAppUserAgent', () => {
  it('recognises the marker the app appends to its WebView UA', () => {
    expect(isNativeAppUserAgent('Mozilla/5.0 (Linux; Android 14; wv) Chrome/120 LexiClashApp/1')).toBe(true);
  });
  it('rejects browsers, other WebViews and missing UA', () => {
    expect(isNativeAppUserAgent('Mozilla/5.0 (Linux; Android 14; wv) Chrome/120 Instagram')).toBe(false);
    expect(isNativeAppUserAgent(null)).toBe(false);
  });
});

describe('nativeHandoffRoute', () => {
  it.each([
    ['/en/pricing', 'en', '/en/web-handoff'],
    ['/he/teacher/upgrade', 'en', '/he/web-handoff'],
    ['/pricing', 'es', '/es/web-handoff'],
    ['/teacher/upgrade/', 'sv', '/sv/web-handoff'],
  ])('%s -> %s', (path, fallback, expected) => {
    expect(nativeHandoffRoute(path, fallback)).toBe(expected);
  });
  it('leaves every other page alone', () => {
    for (const p of ['/en/daily', '/en/teacher', '/en/teacher/upgrade-guide', '/en/pricing-faq', '/en/web-handoff']) {
      expect(nativeHandoffRoute(p, 'en')).toBeNull();
    }
  });
  it('is a known root segment so the unknown-slug gate does not 404 it', () => {
    expect(KNOWN_APP_ROOT_SEGMENTS.has('web-handoff')).toBe(true);
  });
});
