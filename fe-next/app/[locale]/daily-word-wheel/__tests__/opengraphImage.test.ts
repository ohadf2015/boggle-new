import { describe, it, expect } from 'vitest';
import OGImage from '../opengraph-image';
import { WHEEL_OG } from '../wheelOgCopy';

const SCRIPT: Record<string, RegExp> = {
  en: /^[A-Z]$/,
  es: /^[A-ZÑ]$/,
  sv: /^[A-ZÅÄÖ]$/,
  he: /^[א-ת]$/,
  ru: /^[А-ЯЁ]$/,
  ja: /^[぀-ゟ]$/,
};

describe('Daily Word Wheel OG image', () => {
  it.each(Object.keys(SCRIPT))('%s wheel uses only its own letters and traces a word on the wheel', (locale) => {
    const { center, outer, word } = WHEEL_OG[locale as keyof typeof WHEEL_OG];
    const wheel = [center, ...outer];
    expect(outer).toHaveLength(6);
    for (const letter of wheel) expect(letter).toMatch(SCRIPT[locale]);
    for (const letter of word) expect(wheel).toContain(letter);
    expect(word).toContain(center);
  });

  it.each(['en', 'he', 'ja', 'ru', 'xx'])('renders a 1200x630 PNG for %s', async (locale) => {
    const res = await OGImage({ params: Promise.resolve({ locale }) });
    expect(res.headers.get('content-type')).toContain('image/png');
    const png = Buffer.from(await res.arrayBuffer());
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }, 30_000);
});
