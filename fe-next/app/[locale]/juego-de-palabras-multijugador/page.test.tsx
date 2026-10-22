import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

describe('/es/juego-de-palabras-multijugador metadata', () => {
  it('uses a keyword-led title and a CTR-focused description for scrabble online', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'es' }) });

    // Title is kept under 60 chars so Google does not truncate it in the SERP.
    // Update BOTH this expectation and page.tsx together — a daily SEO edit
    // changed only page.tsx while CI was disabled and turned the suite red.
    expect(meta.title).toBe('Juega Scrabble Online Gratis en Español | LexiClash');
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description).toBe(
      'Scrabble online en español gratis — sin registro, sin app. Crea sala, comparte el enlace y compite en tiempo real con hasta 50 jugadores →',
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/es/juego-de-palabras-multijugador');
  });

  it('keeps non-Spanish locale variants noindexed', async () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'ru']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toEqual({ index: false, follow: true });
    }
  });
});
