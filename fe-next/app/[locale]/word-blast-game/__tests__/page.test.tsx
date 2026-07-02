import { describe, it, expect } from 'vitest';
import { generateMetadata } from '../page';

describe('/word-blast-game landing metadata', () => {
  const meta = (locale: string) => generateMetadata({ params: Promise.resolve({ locale }) });

  it('indexes the EN page', async () => {
    expect((await meta('en')).robots).toMatchObject({ index: true, follow: true });
  });

  it('noindexes non-EN variants (English body) but keeps follow', async () => {
    expect((await meta('he')).robots).toMatchObject({ index: false, follow: true });
  });

  it('canonicalizes non-EN variants onto the EN URL', async () => {
    const m = await meta('sv');
    expect(m.alternates?.canonical).toBe('https://www.lexiclash.live/en/word-blast-game');
  });

  it('has a keyword-bearing title and description', async () => {
    const m = await meta('en');
    expect(String(m.title)).toMatch(/word blast/i);
    expect(String(m.description).split(' ').length).toBeGreaterThan(15);
  });
});
