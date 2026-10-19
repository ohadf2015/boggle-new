import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

describe('/es/juego-de-palabras-multijugador metadata', () => {
  it('uses a keyword-led title and a CTR-focused description for scrabble online', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'es' }) });

    // Title is kept under 60 chars so Google does not truncate it in the SERP.
    // Update BOTH this expectation and page.tsx together — #1071 changed only
    // page.tsx and turned master red; #1276 and #1373 (daily SEO) fixed both.
    expect(meta.title).toBe('Scrabble Online en Español Gratis — Juega Ahora | LexiClash');
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description).toBe(
      'Scrabble Online en Español — juega gratis con amigos, sin cuenta ni app. Hasta 50 jugadores en tiempo real. ¡Empieza ya! →',
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
