import { describe, it, expect } from 'vitest';
import { parseResultUrl, rasterizeSvgToPng, extractJobId } from '../glowUpProvider.server';

describe('extractJobId', () => {
  it('returns the first id from the create response array', () => {
    expect(extractJobId(['abc-123', 'def-456'])).toBe('abc-123');
  });
  it('throws on empty or malformed responses', () => {
    expect(() => extractJobId([])).toThrow();
    expect(() => extractJobId({})).toThrow();
    expect(() => extractJobId(null)).toThrow();
  });
});

describe('parseResultUrl', () => {
  it('extracts the first result_url from CLI json output', () => {
    const stdout = JSON.stringify([
      { status: 'completed', result_url: 'https://cdn/x.png' },
    ]);
    expect(parseResultUrl(stdout)).toBe('https://cdn/x.png');
  });

  it('throws when no result_url is present', () => {
    expect(() => parseResultUrl(JSON.stringify([{ status: 'failed' }]))).toThrow();
  });

  it('throws on malformed json', () => {
    expect(() => parseResultUrl('not json')).toThrow();
  });
});

describe('rasterizeSvgToPng', () => {
  it('produces a PNG buffer (magic bytes) from svg markup', async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="40" fill="#BFFF00"/></svg>';
    const png = await rasterizeSvgToPng(svg, 64);
    // PNG signature: 89 50 4E 47
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png[2]).toBe(0x4e);
    expect(png[3]).toBe(0x47);
    expect(png.length).toBeGreaterThan(100);
  });
});
