import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

describe('connections/play page metadata', () => {
  it('noindexes for all locales (game route, not landing)', async () => {
    for (const locale of ['en', 'he', 'sv', 'ja', 'es']) {
      const meta = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(meta.robots).toMatchObject({ index: false, follow: true });
    }
  });

  it('canonicalizes back to the landing /connections URL', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ locale: 'en' }) });
    expect(meta.alternates?.canonical).toBe('https://www.lexiclash.live/en/connections');
  });
});
