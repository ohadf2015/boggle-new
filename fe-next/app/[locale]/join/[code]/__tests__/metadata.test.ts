/**
 * The join link is the thing teachers actually send.
 *
 * `/join/[code]` is pasted into a class WhatsApp group, an LMS post, or an
 * email, and each of those renders the title and description we hand it. Every
 * other locale-aware page in this funnel — including the `/join` sibling right
 * next door — carries a per-locale map; this one answered in English to a
 * Hebrew class. The page is `noindex`, so this is not an SEO question: it is
 * what thirty students see on the unfurl before they tap.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../PageClient', () => ({ default: () => null }));

import { generateMetadata } from '../page';

const meta = (locale: string, code = 'AB3K9Z') =>
  generateMetadata({ params: Promise.resolve({ locale, code }) });

describe('/join/[code] metadata', () => {
  it('speaks Hebrew to a Hebrew class', async () => {
    const m = await meta('he');
    expect(m.title).toContain('הצטרפות');
    expect(String(m.description)).toMatch(/[֐-׿]/);
  });

  it('speaks Spanish, Swedish, Japanese and Russian too', async () => {
    expect(String((await meta('es')).title)).toContain('Unirse');
    expect(String((await meta('sv')).title)).toContain('Gå med');
    expect(String((await meta('ja')).title)).toContain('参加');
    expect(String((await meta('ru')).title)).toContain('Присоединиться');
  });

  it('always shows the code — it is the one thing a student checks', async () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      expect(String((await meta(locale)).title)).toContain('AB3K9Z');
    }
  });

  it('falls back to English for a locale we do not ship', async () => {
    const m = await meta('pt');
    expect(String(m.title)).toContain('Join');
    expect(String(m.title)).toContain('AB3K9Z');
  });

  it('keeps the og image and the noindex — a join link is not a landing page', async () => {
    const m = await meta('he');
    expect(m.openGraph?.images).toBeTruthy();
    expect(m.robots).toMatchObject({ index: false });
  });

  it('uses the English og image for Russian, which has none of its own', async () => {
    const m = await meta('ru');
    const images = m.openGraph?.images as Array<{ url: string }>;
    expect(images[0].url).toContain('og-image-en');
  });
});
