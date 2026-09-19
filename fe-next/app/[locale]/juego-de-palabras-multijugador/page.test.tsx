import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

describe('/es/juego-de-palabras-multijugador metadata', () => {
  it('uses a keyword-led title and a CTR-focused description for scrabble online', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'es' }) });

    // Title is kept under 60 chars so Google does not truncate it in the SERP
    // (#1071 shortened it from 74). Update BOTH this expectation and page.tsx
    // together — that PR changed only page.tsx and turned master red.
    expect(meta.title).toBe('Scrabble Online en Español Gratis — Sin Turnos | LexiClash');
    expect(meta.title.length).toBeLessThanOrEqual(60);
    expect(meta.description).toBe(
      'Juega Scrabble en español online gratis — sin turnos de espera, sin app, sin registro. Hasta 50 jugadores compitiendo en tiempo real. ¡Crea sala ya! →',
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
