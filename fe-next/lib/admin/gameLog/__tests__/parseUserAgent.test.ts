import { describe, it, expect } from 'vitest';
import { parseUserAgent } from '../parseUserAgent';

describe('parseUserAgent', () => {
  it('returns nulls for empty/undefined input', () => {
    expect(parseUserAgent(null)).toEqual({ device_type: null, browser: null, os: null });
    expect(parseUserAgent(undefined)).toEqual({ device_type: null, browser: null, os: null });
    expect(parseUserAgent('')).toEqual({ device_type: null, browser: null, os: null });
  });

  it('detects desktop Mac Chrome', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
    const r = parseUserAgent(ua);
    expect(r.device_type).toBe('desktop');
    expect(r.browser).toBe('Chrome');
    expect(r.os).toBe('macOS');
  });

  it('detects Android phone', () => {
    const ua =
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    const r = parseUserAgent(ua);
    expect(r.device_type).toBe('mobile');
    expect(r.os).toBe('Android');
    expect(r.browser).toBe('Chrome');
  });

  it('detects iPhone Safari', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    const r = parseUserAgent(ua);
    expect(r.device_type).toBe('mobile');
    expect(r.os).toBe('iOS');
    expect(r.browser).toBe('Safari');
  });

  it('detects iPad as tablet', () => {
    const ua =
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
    const r = parseUserAgent(ua);
    expect(r.device_type).toBe('tablet');
    expect(r.os).toBe('iOS');
  });

  it('detects Firefox and Edge', () => {
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      ).browser,
    ).toBe('Firefox');
    expect(
      parseUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      ).browser,
    ).toBe('Edge');
  });

  it('does not misclassify Chrome as Safari', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';
    expect(parseUserAgent(ua).browser).toBe('Chrome');
  });
});
