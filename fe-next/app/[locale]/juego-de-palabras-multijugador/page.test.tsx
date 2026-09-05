import { describe, expect, it } from 'vitest';
import { generateMetadata } from './page';

describe('/es/juego-de-palabras-multijugador metadata', () => {
  it('uses a keyword-led title and a CTR-focused description for scrabble online', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'es' }) });

    expect(meta.title).toBe('Scrabble Online en Español Gratis — Sin Registro | LexiClash');
    expect(meta.description).toBe(
      'Juega Scrabble online en español gratis — sin registro ni descarga. Hasta 50 jugadores en tiempo real. La mejor alternativa gratuita →',
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
